-- CORRECTIVE FIX: Remove recursive RLS policies and recreate using SECURITY DEFINER functions
-- This fixes the "infinite recursion detected in policy for relation user_roles" error

-- Step 1: Drop problematic recursive policies from user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Step 2: Drop problematic recursive policy from auth_attempts
DROP POLICY IF EXISTS "Admins can view auth attempts" ON auth_attempts;

-- Step 3: Recreate user_roles policies using SECURITY DEFINER functions
-- These functions bypass RLS and prevent infinite recursion
CREATE POLICY "Admins can view all roles"
ON user_roles
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
ON user_roles
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
ON user_roles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON user_roles
FOR DELETE
USING (public.is_admin());

-- Step 4: Recreate auth_attempts policy using SECURITY DEFINER function
CREATE POLICY "Admins can view auth attempts"
ON auth_attempts
FOR SELECT
USING (public.is_admin());

-- Note: "Service role can insert auth attempts" policy already exists and is correct