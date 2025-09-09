-- ============================================
-- CORREÇÃO DE SEGURANÇA RLS - ABORDAGEM SIMPLIFICADA
-- Foco apenas nas correções críticas conhecidas
-- ============================================

-- FASE 1: Correções Críticas Imediatas
-- Habilitar RLS nas tabelas com políticas existentes mas RLS desabilitado

-- qa_test_cases (já tem 7 políticas)
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;

-- regime_urbanistico_consolidado (já tem 1 política)  
ALTER TABLE public.regime_urbanistico_consolidado ENABLE ROW LEVEL SECURITY;

-- FASE 2: Habilitar RLS em tabelas existentes críticas
-- (sem criar políticas complexas que podem falhar)

-- messages - habilitar RLS se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- chat_memory - habilitar RLS se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_memory') THEN
        ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- FASE 3: Criar tabelas novas para dados sensíveis (sem depender de estruturas existentes)

-- user_feedback - tabela nova para feedback de usuários
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    feedback_type text NOT NULL,
    content text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    session_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas simples para user_feedback
CREATE POLICY "Users can view own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_queries - tabela nova para queries de usuários
CREATE TABLE IF NOT EXISTS public.user_queries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    query_text text NOT NULL,
    response_text text,
    session_id uuid,
    model_used text,
    tokens_used integer DEFAULT 0,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_queries ENABLE ROW LEVEL SECURITY;

-- Políticas simples para user_queries
CREATE POLICY "Users can view own queries" ON public.user_queries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON public.user_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FASE 4: Verificação final
-- Verificar status de RLS nas tabelas críticas
SELECT 
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Desabilitado'
    END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'qa_test_cases',
    'regime_urbanistico_consolidado', 
    'user_feedback',
    'user_queries',
    'messages',
    'chat_memory'
  )
ORDER BY tablename;

-- Função para monitoramento futuro
CREATE OR REPLACE FUNCTION public.check_rls_security()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count bigint,
    security_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity,
        COALESCE(p.policy_count, 0),
        CASE 
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ Seguro'
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS sem políticas'
            WHEN NOT t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '❌ Políticas sem RLS'
            ELSE '❌ Sem proteção'
        END::text
    FROM pg_tables t
    LEFT JOIN (
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename;
END;
$$;

-- Mensagem de confirmação
SELECT 
    '🔒 CORREÇÃO DE SEGURANÇA CONCLUÍDA' as status,
    'RLS habilitado nas tabelas críticas' as message,
    'Execute: SELECT * FROM public.check_rls_security() para verificar' as next_step;