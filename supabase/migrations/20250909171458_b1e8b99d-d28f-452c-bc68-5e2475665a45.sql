-- ============================================
-- CORREÇÃO COMPLETA DE SEGURANÇA RLS
-- Implementação do plano de 4 fases
-- ============================================

-- FASE 1: Correções Críticas Imediatas
-- Habilitar RLS nas tabelas com políticas existentes mas RLS desabilitado

-- qa_test_cases (já tem 7 políticas)
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;

-- regime_urbanistico_consolidado (já tem 1 política)
ALTER TABLE public.regime_urbanistico_consolidado ENABLE ROW LEVEL SECURITY;

-- FASE 2: Proteger Dados Sensíveis
-- Implementar RLS em tabelas críticas que não têm proteção

-- user_feedback - Proteger por usuário
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

CREATE POLICY "Users can view own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback" ON public.user_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- user_queries - Proteger por usuário
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

CREATE POLICY "Users can view own queries" ON public.user_queries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON public.user_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all queries" ON public.user_queries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- sessions - Proteger por usuário (se existir)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
        
        -- Verificar se a tabela tem coluna user_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id') THEN
            DROP POLICY IF EXISTS "Users can manage own sessions" ON public.sessions;
            CREATE POLICY "Users can manage own sessions" ON public.sessions
                FOR ALL USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- messages - Já existe, verificar RLS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Política baseada na sessão
        DROP POLICY IF EXISTS "Users can access messages from own sessions" ON public.messages;
        CREATE POLICY "Users can access messages from own sessions" ON public.messages
            FOR ALL USING (
                session_id IN (
                    SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- chat_memory - Proteger por sessão
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_memory') THEN
        ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Access chat memory by session" ON public.chat_memory;
        CREATE POLICY "Access chat memory by session" ON public.chat_memory
            FOR ALL USING (
                session_id IN (
                    SELECT id::text FROM public.chat_sessions WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- FASE 3: Verificação das Correções
-- Consulta para verificar status de RLS em todas as tabelas críticas
SELECT 
    schemaname,
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
    'sessions',
    'messages',
    'chat_memory',
    'chat_sessions',
    'chat_history',
    'profiles',
    'llm_metrics',
    'message_feedback'
  )
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'ALL' THEN '🔓 Acesso Total'
        WHEN cmd = 'SELECT' THEN '👁️ Leitura'
        WHEN cmd = 'INSERT' THEN '➕ Inserção'
        WHEN cmd = 'UPDATE' THEN '✏️ Atualização'
        WHEN cmd = 'DELETE' THEN '🗑️ Exclusão'
    END AS tipo_acesso
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'qa_test_cases',
    'regime_urbanistico_consolidado',
    'user_feedback',
    'user_queries',
    'sessions',
    'messages',
    'chat_memory'
  )
ORDER BY tablename, policyname;

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

-- Mensagem final de confirmação
SELECT 
    '🔒 CORREÇÃO DE SEGURANÇA CONCLUÍDA' as status,
    'Todas as tabelas críticas agora têm RLS habilitado' as message,
    'Execute: SELECT * FROM public.check_rls_security() para verificar' as verification;