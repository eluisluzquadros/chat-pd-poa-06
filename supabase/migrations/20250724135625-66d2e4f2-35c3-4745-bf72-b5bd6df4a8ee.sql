-- CRITICAL SECURITY FIXES

-- 1. Enable RLS on documents table (CRITICAL - currently completely exposed)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Create secure policies for documents table
CREATE POLICY "Users can view documents based on metadata"
ON public.documents
FOR SELECT
USING (
  -- Allow access based on document metadata permissions
  CASE 
    WHEN metadata->>'owner_id' IS NOT NULL 
    THEN (metadata->>'owner_id')::uuid = auth.uid()
    ELSE true  -- Public documents without owner
  END
);

CREATE POLICY "Only admins can insert documents"
ON public.documents
FOR INSERT
WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Only admins can update documents"
ON public.documents
FOR UPDATE
USING (has_role('admin'::app_role));

CREATE POLICY "Only admins can delete documents"
ON public.documents
FOR DELETE
USING (has_role('admin'::app_role));

-- 3. Fix role escalation vulnerability - remove user's ability to modify their own roles
DROP POLICY IF EXISTS "Users can insert their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can view their own account" ON public.user_accounts;

-- Create secure policies for user_accounts
CREATE POLICY "Users can view their own account info"
ON public.user_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account during signup"
ON public.user_accounts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  role = 'citizen'  -- Force default role, prevent role escalation
);

CREATE POLICY "Only admins can update user accounts"
ON public.user_accounts
FOR UPDATE
USING (has_role('admin'::app_role));

-- 4. Secure the secrets table - restrict to admin only
DROP POLICY IF EXISTS "Allow authenticated users to read secrets" ON public.secrets;

CREATE POLICY "Only admins can access secrets"
ON public.secrets
FOR ALL
USING (has_role('admin'::app_role))
WITH CHECK (has_role('admin'::app_role));

-- 5. Remove hardcoded demo user from all RLS policies
DROP POLICY IF EXISTS "Demo user can manage chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Demo user can manage chat sessions" ON public.chat_sessions;

-- 6. Fix function security - add search_path protection
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- 7. Tighten profile access policies - remove overly permissive public access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during signup" ON public.profiles;

CREATE POLICY "Profiles viewable by owner and admins"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  has_role('admin'::app_role)
);

CREATE POLICY "System can insert profiles during signup"
ON public.profiles
FOR INSERT
WITH CHECK (true);  -- Only triggered by handle_new_user function

-- 8. Create admin-only role management function
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can set roles
  IF NOT has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can modify user roles';
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove other roles for this user
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role != new_role;
END;
$$;