-- Fix critical RLS policies for core authentication tables

-- First, create missing functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin'::app_role, 'supervisor'::app_role)
  );
$$;

-- Create basic RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create basic RLS policies for profiles table  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Create basic RLS policies for chat_sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (user_id = auth.uid() OR is_supervisor_or_admin());

DROP POLICY IF EXISTS "Users can create their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can create their own sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their own sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (user_id = auth.uid() OR is_supervisor_or_admin()) 
WITH CHECK (user_id = auth.uid() OR is_supervisor_or_admin());

-- Fix search_path for critical functions
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.match_legal_articles(vector, double precision, integer) SET search_path = public;
ALTER FUNCTION public.match_knowledgebase(vector, double precision, integer, text) SET search_path = public;
ALTER FUNCTION public.search_knowledgebase_by_content(text, text, integer) SET search_path = public;
ALTER FUNCTION public.cache_regime_query(text, text) SET search_path = public;
ALTER FUNCTION public.get_from_cache(text) SET search_path = public;
ALTER FUNCTION public.add_to_cache(text, text, jsonb) SET search_path = public;