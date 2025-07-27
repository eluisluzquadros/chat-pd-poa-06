-- PHASE 2: Fix function search paths and move hardcoded credentials to secrets
-- Add assistant_id and vector_store_id to secrets table
INSERT INTO public.secrets (name, secret_value) 
VALUES 
  ('OPENAI_ASSISTANT_ID', 'asst_W3sHReYxtgfbdL3ahMvE9uCO'),
  ('OPENAI_VECTOR_STORE_ID', 'vs_67a63571cd7c8191906f40a7e6b0a727')
ON CONFLICT (name) DO UPDATE SET 
  secret_value = EXCLUDED.secret_value,
  updated_at = now();

-- Update existing security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT role FROM public.user_accounts WHERE user_id = auth.uid() LIMIT 1),
    'user'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT public.get_current_user_role() = 'admin';
$function$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT public.get_current_user_role() IN ('admin', 'supervisor');
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Create user account
  INSERT INTO public.user_accounts (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'user'
  );
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Add rate limiting function for authentication attempts
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(user_ip inet, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count integer;
BEGIN
  -- Check attempts in the time window
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.auth_attempts
  WHERE ip_address = user_ip
    AND created_at > now() - (window_minutes || ' minutes')::interval;
    
  RETURN attempt_count < max_attempts;
END;
$function$;

-- Create auth attempts tracking table
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  success boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view auth attempts
CREATE POLICY "Only admins can view auth attempts"
ON public.auth_attempts
FOR SELECT
USING (is_admin());

-- Add audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins and supervisors can view audit logs
CREATE POLICY "Supervisors and admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (is_supervisor_or_admin());

-- Add function to log user actions
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name text,
  table_name text DEFAULT NULL,
  record_id text DEFAULT NULL,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    action_name,
    table_name,
    record_id,
    old_values,
    new_values,
    now()
  );
END;
$function$;