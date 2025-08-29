-- ============================================
-- FORÇAR DESABILITAÇÃO DO RLS
-- ============================================

-- 1. DESABILITAR RLS FORÇADAMENTE
ALTER TABLE public.qa_validation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_validation_runs FORCE ROW LEVEL SECURITY TO FALSE;

ALTER TABLE public.qa_validation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_validation_results FORCE ROW LEVEL SECURITY TO FALSE;

ALTER TABLE public.qa_test_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases FORCE ROW LEVEL SECURITY TO FALSE;

-- 2. REMOVER TODAS AS POLÍTICAS
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Remove todas as políticas de qa_validation_runs
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'qa_validation_runs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.qa_validation_runs', pol.policyname);
    END LOOP;
    
    -- Remove todas as políticas de qa_validation_results
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'qa_validation_results'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.qa_validation_results', pol.policyname);
    END LOOP;
    
    -- Remove todas as políticas de qa_test_cases
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'qa_test_cases'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.qa_test_cases', pol.policyname);
    END LOOP;
END $$;

-- 3. CRIAR POLÍTICAS PERMISSIVAS (PERMITIR TUDO)
-- Se o RLS não puder ser desabilitado, criar políticas que permitam tudo

-- qa_validation_runs
CREATE POLICY "allow_all_qa_validation_runs" ON public.qa_validation_runs
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- qa_validation_results  
CREATE POLICY "allow_all_qa_validation_results" ON public.qa_validation_results
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- qa_test_cases
CREATE POLICY "allow_all_qa_test_cases" ON public.qa_test_cases
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. GARANTIR PERMISSÕES
GRANT ALL ON public.qa_validation_runs TO PUBLIC;
GRANT ALL ON public.qa_validation_results TO PUBLIC;
GRANT ALL ON public.qa_test_cases TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- 5. VERIFICAR STATUS
SELECT 
    tablename,
    rowsecurity as "RLS Status",
    CASE 
        WHEN rowsecurity = true THEN 'RLS ATIVO - Políticas permissivas criadas'
        ELSE 'RLS DESABILITADO - Acesso livre'
    END as "Situação"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases');

-- 6. VERIFICAR POLÍTICAS
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('qa_validation_runs', 'qa_validation_results', 'qa_test_cases');

-- 7. MENSAGEM FINAL
SELECT 
    'CORREÇÃO APLICADA' as status,
    'Se RLS estava ativo, agora há políticas permitindo acesso total' as mensagem;