-- Verificar políticas RLS na tabela qa_validation_runs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'qa_validation_runs';

-- Verificar se RLS está habilitado
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as force_rls
FROM pg_class
WHERE relname = 'qa_validation_runs';

-- Desabilitar RLS temporariamente (se necessário)
-- ALTER TABLE qa_validation_runs DISABLE ROW LEVEL SECURITY;