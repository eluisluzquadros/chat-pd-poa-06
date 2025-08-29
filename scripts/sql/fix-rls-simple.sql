-- ============================================
-- SCRIPT SIMPLES E CORRETO PARA DESABILITAR RLS
-- ============================================

-- 1. DESABILITAR RLS
ALTER TABLE public.qa_validation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_validation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "allow_all_qa_validation_runs" ON public.qa_validation_runs;
DROP POLICY IF EXISTS "allow_all_qa_validation_results" ON public.qa_validation_results;
DROP POLICY IF EXISTS "allow_all_qa_test_cases" ON public.qa_test_cases;

-- 3. SE O RLS NÃO PUDER SER DESABILITADO, CRIAR POLÍTICAS QUE PERMITAM TUDO
DO $$
BEGIN
    -- Verifica se RLS ainda está ativo e cria políticas permissivas
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'qa_validation_runs' AND rowsecurity = true) THEN
        CREATE POLICY "allow_all_qa_validation_runs" ON public.qa_validation_runs
            FOR ALL TO PUBLIC
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'qa_validation_results' AND rowsecurity = true) THEN
        CREATE POLICY "allow_all_qa_validation_results" ON public.qa_validation_results
            FOR ALL TO PUBLIC
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'qa_test_cases' AND rowsecurity = true) THEN
        CREATE POLICY "allow_all_qa_test_cases" ON public.qa_test_cases
            FOR ALL TO PUBLIC
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 4. GARANTIR PERMISSÕES TOTAIS
GRANT ALL ON public.qa_validation_runs TO anon;
GRANT ALL ON public.qa_validation_runs TO authenticated;
GRANT ALL ON public.qa_validation_runs TO service_role;

GRANT ALL ON public.qa_validation_results TO anon;
GRANT ALL ON public.qa_validation_results TO authenticated;
GRANT ALL ON public.qa_validation_results TO service_role;

GRANT ALL ON public.qa_test_cases TO anon;
GRANT ALL ON public.qa_test_cases TO authenticated;
GRANT ALL ON public.qa_test_cases TO service_role;

-- Garantir acesso às sequências
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. LIMPAR RUNS TRAVADAS
UPDATE qa_validation_runs 
SET status = 'completed', 
    completed_at = COALESCE(completed_at, now())
WHERE status = 'running' 
  AND started_at < now() - interval '5 minutes';

-- 6. VERIFICAR STATUS FINAL
SELECT 
    'Tabela' as info_type,
    tablename as name,
    CASE 
        WHEN rowsecurity = true THEN 'RLS ATIVO (com políticas permissivas)'
        ELSE 'RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases')

UNION ALL

SELECT 
    'Política' as info_type,
    tablename || ' - ' || policyname as name,
    'PERMITE TUDO' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases')

UNION ALL

SELECT 
    'Contagem' as info_type,
    'Total de runs' as name,
    COUNT(*)::text as status
FROM qa_validation_runs

UNION ALL

SELECT 
    'Contagem' as info_type,
    'Total de resultados' as name,
    COUNT(*)::text as status
FROM qa_validation_results

UNION ALL

SELECT 
    'Contagem' as info_type,
    'Total de casos de teste' as name,
    COUNT(*)::text as status
FROM qa_test_cases;

-- 7. MENSAGEM FINAL
SELECT 
    '✅ SCRIPT EXECUTADO COM SUCESSO' as status,
    'Tabelas QA devem estar acessíveis agora' as mensagem,
    current_timestamp as executado_em;