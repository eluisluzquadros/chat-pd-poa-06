-- Habilitar RLS na tabela qa_test_cases
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;

-- Criar função helper is_admin se não existir
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
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

-- Policy: Admins têm acesso total
CREATE POLICY "Admins can manage qa_test_cases"
ON qa_test_cases
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Usuários autenticados podem visualizar casos ativos
CREATE POLICY "Users can view active test cases"
ON qa_test_cases
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Service role tem acesso total (para edge functions)
CREATE POLICY "Service role full access to qa_test_cases"
ON qa_test_cases
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);