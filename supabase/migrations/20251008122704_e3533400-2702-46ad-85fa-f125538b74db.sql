-- 1. Adicionar 'ERRO' ao CHECK CONSTRAINT de security_test_results
ALTER TABLE security_test_results 
DROP CONSTRAINT IF EXISTS security_test_results_result_check;

ALTER TABLE security_test_results 
ADD CONSTRAINT security_test_results_result_check 
CHECK (result = ANY (ARRAY['PASSOU'::text, 'FALHOU'::text, 'PARCIAL'::text, 'ERRO'::text]));

-- 2. RLS Policy: Permitir admins deletarem security_validation_runs
CREATE POLICY "Admins can delete security validation runs"
ON security_validation_runs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- 3. RLS Policy: Permitir admins deletarem security_test_results  
CREATE POLICY "Admins can delete test results"
ON security_test_results
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);