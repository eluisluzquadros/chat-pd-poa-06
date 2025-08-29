-- Update RLS policies for qa_test_cases to allow supervisors to insert
DROP POLICY IF EXISTS "Admins can manage QA test cases" ON qa_test_cases;

-- Create separate policies for different operations
CREATE POLICY "Admins and supervisors can insert QA test cases" 
ON qa_test_cases 
FOR INSERT 
TO authenticated
WITH CHECK (is_supervisor_or_admin());

CREATE POLICY "Admins and supervisors can update QA test cases" 
ON qa_test_cases 
FOR UPDATE 
TO authenticated
USING (is_supervisor_or_admin());

CREATE POLICY "Admins and supervisors can delete QA test cases" 
ON qa_test_cases 
FOR DELETE 
TO authenticated
USING (is_supervisor_or_admin());

-- Promote current demo user to supervisor role if exists
UPDATE user_roles 
SET role = 'supervisor'::app_role, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@pdus.com' LIMIT 1)
AND role = 'user'::app_role;