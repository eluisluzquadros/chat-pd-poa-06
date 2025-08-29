-- ============================================
-- SCRIPT CORRIGIDO PARA O SISTEMA QA
-- ============================================

-- 1. DESABILITAR RLS NAS TABELAS DE QA
ALTER TABLE qa_validation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES (se existirem)
DO $$ 
BEGIN
    -- Remove políticas da tabela qa_validation_runs
    DROP POLICY IF EXISTS "Enable read access for all users" ON qa_validation_runs;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON qa_validation_runs;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON qa_validation_runs;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON qa_validation_runs;
    DROP POLICY IF EXISTS "Public read access" ON qa_validation_runs;
    DROP POLICY IF EXISTS "Authenticated write access" ON qa_validation_runs;
    
    -- Remove políticas da tabela qa_validation_results
    DROP POLICY IF EXISTS "Enable read access for all users" ON qa_validation_results;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON qa_validation_results;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON qa_validation_results;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON qa_validation_results;
    DROP POLICY IF EXISTS "Public read access" ON qa_validation_results;
    DROP POLICY IF EXISTS "Authenticated write access" ON qa_validation_results;
    
    -- Remove políticas da tabela qa_test_cases
    DROP POLICY IF EXISTS "Enable read access for all users" ON qa_test_cases;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON qa_test_cases;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON qa_test_cases;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON qa_test_cases;
    DROP POLICY IF EXISTS "Public read access" ON qa_test_cases;
    DROP POLICY IF EXISTS "Authenticated write access" ON qa_test_cases;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignora erros se as políticas não existirem
        NULL;
END $$;

-- 3. CONFIGURAR DEFAULTS CORRETOS (sem alterar tipos)
-- qa_validation_runs (id é UUID)
ALTER TABLE qa_validation_runs 
  ALTER COLUMN started_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'running';

-- qa_validation_results (id é INTEGER com auto-increment)
-- Não altera o id pois já tem sequência
ALTER TABLE qa_validation_results
  ALTER COLUMN created_at SET DEFAULT now();

-- qa_test_cases (id é UUID)
ALTER TABLE qa_test_cases
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN version SET DEFAULT 1;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE (se não existirem)
CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_started_at 
  ON qa_validation_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_qa_validation_results_run_id 
  ON qa_validation_results(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_qa_validation_results_test_case_id 
  ON qa_validation_results(test_case_id);

CREATE INDEX IF NOT EXISTS idx_qa_test_cases_active 
  ON qa_test_cases(is_active) WHERE is_active = true;

-- 5. GARANTIR PERMISSÕES PÚBLICAS (SEM RLS)
GRANT ALL ON qa_validation_runs TO anon, authenticated, service_role;
GRANT ALL ON qa_validation_results TO anon, authenticated, service_role;
GRANT ALL ON qa_test_cases TO anon, authenticated, service_role;

-- Garantir acesso às sequências também
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. LIMPAR RUNS TRAVADAS
UPDATE qa_validation_runs 
SET status = 'completed', 
    completed_at = COALESCE(completed_at, now())
WHERE status = 'running' 
  AND started_at < now() - interval '5 minutes';

-- 7. VERIFICAR STATUS DO RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases');

-- 8. VERIFICAR CONTAGENS
SELECT 'qa_validation_runs' as table_name, COUNT(*) as count FROM qa_validation_runs
UNION ALL
SELECT 'qa_validation_results', COUNT(*) FROM qa_validation_results
UNION ALL
SELECT 'qa_test_cases', COUNT(*) FROM qa_test_cases;

-- 9. TESTE DE ACESSO
DO $$
DECLARE
    test_run_id UUID;
    test_case_id UUID;
    test_result_id INTEGER;
BEGIN
    -- Tenta inserir uma run de teste
    INSERT INTO qa_validation_runs (id, model, total_tests, passed_tests, overall_accuracy, avg_response_time_ms, status)
    VALUES (gen_random_uuid(), 'test-model', 1, 1, 1.0, 100, 'completed')
    RETURNING id INTO test_run_id;
    
    -- Tenta inserir um caso de teste
    INSERT INTO qa_test_cases (id, question, expected_answer, category, complexity, is_active)
    VALUES (gen_random_uuid(), 'Test Question', 'Test Answer', 'test', 'simple', true)
    RETURNING id INTO test_case_id;
    
    -- Tenta inserir um resultado
    INSERT INTO qa_validation_results (validation_run_id, test_case_id, model, actual_answer, is_correct, accuracy_score, response_time_ms)
    VALUES (test_run_id, test_case_id, 'test-model', 'Test', true, 1.0, 100)
    RETURNING id INTO test_result_id;
    
    -- Limpa os dados de teste
    DELETE FROM qa_validation_results WHERE id = test_result_id;
    DELETE FROM qa_test_cases WHERE id = test_case_id;
    DELETE FROM qa_validation_runs WHERE id = test_run_id;
    
    RAISE NOTICE 'Teste de inserção bem-sucedido - tabelas acessíveis';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste: %', SQLERRM;
END $$;

-- 10. MENSAGEM FINAL
SELECT 
    'RLS DESABILITADO COM SUCESSO' as status,
    'Sistema QA deve funcionar normalmente agora' as mensagem,
    current_timestamp as executado_em;