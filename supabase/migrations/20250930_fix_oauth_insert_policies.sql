-- Migration: Fix OAuth auto-provisioning by adding INSERT policies
-- Date: 2025-09-30
-- Description: Adds INSERT policies to allow new users to self-provision during OAuth

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Allow authenticated users to INSERT their own account
CREATE POLICY "Users can insert their own account" ON public.user_accounts
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to INSERT their own roles (ONLY 'citizen' role for security)
CREATE POLICY "Users can insert their own roles" ON public.user_roles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'citizen'
  );

-- Grant INSERT permission on tables to authenticated users
GRANT INSERT ON public.user_accounts TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;

-- Add comment
COMMENT ON POLICY "Users can insert their own account" ON public.user_accounts IS 'Allows OAuth auto-provisioning for new users';
COMMENT ON POLICY "Users can insert their own roles" ON public.user_roles IS 'Allows OAuth auto-provisioning of user roles - RESTRICTED to citizen role only for security';
