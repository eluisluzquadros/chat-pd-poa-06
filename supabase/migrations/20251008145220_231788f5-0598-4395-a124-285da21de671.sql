-- SECURITY FIX: Add proper RLS policies for auth_attempts table
-- Allow service role to insert (for logging authentication attempts)
DROP POLICY IF EXISTS "Only admins can view auth attempts" ON auth_attempts;

CREATE POLICY "Service role can insert auth attempts"
ON auth_attempts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view auth attempts"
ON auth_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- SECURITY FIX: Remove overly permissive policy from user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Add proper admin policies
CREATE POLICY "Admins can view all roles"
ON user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can insert roles"
ON user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update roles"
ON user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete roles"
ON user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);