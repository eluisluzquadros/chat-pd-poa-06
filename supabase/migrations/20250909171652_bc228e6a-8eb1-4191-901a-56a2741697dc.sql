-- ============================================
-- CORREÇÃO DE SEGURANÇA RLS - VERSÃO CORRIGIDA
-- Implementação defensiva com verificação de estrutura
-- ============================================

-- FASE 1: Correções Críticas Imediatas
-- Habilitar RLS nas tabelas com políticas existentes mas RLS desabilitado

-- qa_test_cases (já tem 7 políticas)
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;

-- regime_urbanistico_consolidado (já tem 1 política)
ALTER TABLE public.regime_urbanistico_consolidado ENABLE ROW LEVEL SECURITY;

-- FASE 2: Proteger Dados Sensíveis com Verificação Defensiva

-- user_feedback - Criar tabela se não existir
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

-- Criar políticas para user_feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
CREATE POLICY "Users can view own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
CREATE POLICY "Users can insert own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;
CREATE POLICY "Admins can view all feedback" ON public.user_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- user_queries - Criar tabela se não existir
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

-- Criar políticas para user_queries
DROP POLICY IF EXISTS "Users can view own queries" ON public.user_queries;
CREATE POLICY "Users can view own queries" ON public.user_queries
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own queries" ON public.user_queries;
CREATE POLICY "Users can insert own queries" ON public.user_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all queries" ON public.user_queries;
CREATE POLICY "Admins can view all queries" ON public.user_queries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- messages - Verificar estrutura e aplicar RLS defensivamente
DO $$ 
BEGIN
    -- Habilitar RLS se a tabela existir
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Verificar se tem session_id para criar política baseada em sessão
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'session_id') THEN
            DROP POLICY IF EXISTS "Users can access messages from own sessions" ON public.messages;
            CREATE POLICY "Users can access messages from own sessions" ON public.messages
                FOR ALL USING (
                    session_id IN (
                        SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
                    )
                );
        ELSE
            -- Se não tem session_id, permitir acesso geral por enquanto (mais restritivo depois)
            DROP POLICY IF EXISTS "Authenticated users can access messages" ON public.messages;
            CREATE POLICY "Authenticated users can access messages" ON public.messages
                FOR ALL USING (auth.uid() IS NOT NULL);
        END IF;
    END IF;
END $$;

-- chat_memory - Verificar estrutura e aplicar RLS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_memory') THEN
        ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
        
        -- Verificar se tem session_id para política baseada em sessão
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_memory' AND column_name = 'session_id') THEN
            DROP POLICY IF EXISTS "Access chat memory by session" ON public.chat_memory;
            CREATE POLICY "Access chat memory by session" ON public.chat_memory
                FOR ALL USING (
                    session_id IN (
                        SELECT id::text FROM public.chat_sessions WHERE user_id = auth.uid()
                    )
                );
        ELSE
            -- Política mais permissiva se não tem session_id
            DROP POLICY IF EXISTS "Authenticated users can access chat memory" ON public.chat_memory;
            CREATE POLICY "Authenticated users can access chat memory" ON public.chat_memory
                FOR ALL USING (auth.uid() IS NOT NULL);
        END IF;
    END IF;
END $$;

-- FASE 3: Verificação das Correções
-- Verificar quais tabelas têm RLS habilitado agora
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
    'chat_memory',
    'chat_sessions',
    'chat_history',
    'profiles',
    'llm_metrics',
    'message_feedback'
  )
ORDER BY tablename;

-- FASE 4: Configuração de Monitoramento
-- Função para verificar segurança RLS
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

-- Mensagem final
SELECT 
    '🔒 CORREÇÃO DE SEGURANÇA CONCLUÍDA' as status,
    'RLS habilitado nas tabelas críticas com verificação defensiva' as message;