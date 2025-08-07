-- VERIFICAR ESTRUTURA DAS TABELAS QA
-- Execute este script primeiro para entender a estrutura

-- 1. Estrutura da tabela qa_validation_runs
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'qa_validation_runs'
ORDER BY ordinal_position;

-- 2. Estrutura da tabela qa_validation_results  
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'qa_validation_results'
ORDER BY ordinal_position;

-- 3. Estrutura da tabela qa_test_cases
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'qa_test_cases'
ORDER BY ordinal_position;

-- 4. Verificar status atual do RLS
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases');

-- 5. Listar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases');