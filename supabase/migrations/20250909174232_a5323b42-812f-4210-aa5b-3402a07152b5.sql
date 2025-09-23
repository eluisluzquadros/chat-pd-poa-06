-- Fix Security Issue: Secure session_memory table with proper RLS policies
-- This prevents unauthorized access to user conversation data

-- First, drop the overly permissive current policy
DROP POLICY IF EXISTS "Users can manage their own session memory" ON session_memory;

-- Create a security definer function to check if user owns the session
CREATE OR REPLACE FUNCTION public.user_owns_session(session_id_param text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM chat_sessions 
    WHERE id::text = session_id_param 
      AND user_id = auth.uid()
  );
$$;

-- Create restrictive RLS policies for session_memory table

-- Policy 1: Users can only view their own session memory
CREATE POLICY "Users can view own session memory" 
ON session_memory 
FOR SELECT 
TO authenticated
USING (user_owns_session(session_id));

-- Policy 2: Users can only insert session memory for their own sessions
CREATE POLICY "Users can insert own session memory" 
ON session_memory 
FOR INSERT 
TO authenticated
WITH CHECK (user_owns_session(session_id));

-- Policy 3: Users can only update their own session memory
CREATE POLICY "Users can update own session memory" 
ON session_memory 
FOR UPDATE 
TO authenticated
USING (user_owns_session(session_id))
WITH CHECK (user_owns_session(session_id));

-- Policy 4: Users can only delete their own session memory
CREATE POLICY "Users can delete own session memory" 
ON session_memory 
FOR DELETE 
TO authenticated
USING (user_owns_session(session_id));

-- Policy 5: Supervisors and admins can view all session memory (for support/moderation)
CREATE POLICY "Supervisors can view all session memory" 
ON session_memory 
FOR SELECT 
TO authenticated
USING (is_supervisor_or_admin());

-- Policy 6: Service role has full access (for system operations)
CREATE POLICY "Service role full access to session memory" 
ON session_memory 
FOR ALL 
TO service_role
USING (true);

-- Also ensure the sessions table has proper RLS policies
-- Drop any overly permissive policies on sessions table if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sessions;
DROP POLICY IF EXISTS "Enable update for users based on email" ON sessions;

-- Check if sessions table exists and has user context
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions' AND table_schema = 'public') THEN
    -- Create secure policies for sessions table if it exists
    CREATE POLICY "Users can manage their own sessions" 
    ON sessions 
    FOR ALL 
    TO authenticated
    USING (
      CASE 
        WHEN user_id IS NOT NULL THEN user_id = auth.uid()
        ELSE false
      END
    );
    
    CREATE POLICY "Service role can manage all sessions" 
    ON sessions 
    FOR ALL 
    TO service_role
    USING (true);
  END IF;
END $$;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON session_memory TO authenticated;
GRANT ALL ON session_memory TO service_role;

-- Revoke public access to ensure only authenticated users can access
REVOKE ALL ON session_memory FROM public;

-- Log the security fix
INSERT INTO audit_log (action, table_name, new_values) 
VALUES (
  'security_fix', 
  'session_memory', 
  '{"description": "Implemented proper RLS policies to prevent unauthorized access to user conversation data", "timestamp": "' || NOW()::text || '"}'::jsonb
);

-- Verify the policies are in place
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual = 'true' THEN 'PUBLICLY_ACCESSIBLE'
        WHEN qual ILIKE '%auth.uid%' OR qual ILIKE '%user_owns_session%' THEN 'USER_RESTRICTED'
        WHEN qual ILIKE '%supervisor%' OR qual ILIKE '%admin%' THEN 'ADMIN_RESTRICTED'
        ELSE 'CUSTOM_LOGIC'
    END AS security_level
FROM pg_policies 
WHERE tablename = 'session_memory'
ORDER BY policyname;