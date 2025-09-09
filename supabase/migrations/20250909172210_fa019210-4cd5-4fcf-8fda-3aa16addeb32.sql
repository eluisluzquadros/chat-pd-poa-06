-- ============================================
-- CORREÇÃO DE SEGURANÇA RLS - BASEADA NA ESTRUTURA REAL
-- ============================================

-- CORREÇÕES CRÍTICAS: Habilitar RLS nas tabelas com políticas mas RLS desabilitado
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regime_urbanistico_consolidado ENABLE ROW LEVEL SECURITY;

-- HABILITAR RLS EM TABELAS SENSÍVEIS SEM PROTEÇÃO
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- CRIAR POLÍTICAS SEGURAS PARA MESSAGES (baseado em session_id)
DROP POLICY IF EXISTS "Users can access messages from own sessions" ON public.messages;
CREATE POLICY "Users can access messages from own sessions" ON public.messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- CRIAR POLÍTICAS PARA CHAT_MEMORY (baseado em session_id) 
DROP POLICY IF EXISTS "Users can access chat memory from own sessions" ON public.chat_memory;
CREATE POLICY "Users can access chat memory from own sessions" ON public.chat_memory
    FOR ALL USING (
        session_id IN (
            SELECT id::text FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- POLÍTICAS PARA USER_FEEDBACK (já tem user_id)
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
CREATE POLICY "Users can view own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
CREATE POLICY "Users can insert own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS PARA USER_QUERIES (já tem user_id)
DROP POLICY IF EXISTS "Users can view own queries" ON public.user_queries;
CREATE POLICY "Users can view own queries" ON public.user_queries
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own queries" ON public.user_queries;
CREATE POLICY "Users can insert own queries" ON public.user_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- VERIFICAÇÃO FINAL
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
    'messages',
    'chat_memory',
    'user_feedback',
    'user_queries',
    'sessions'
  )
ORDER BY tablename;

-- CONTAGEM DE POLÍTICAS POR TABELA
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'qa_test_cases',
    'regime_urbanistico_consolidado',
    'messages',
    'chat_memory',
    'user_feedback',
    'user_queries'
  )
GROUP BY tablename
ORDER BY tablename;

-- MENSAGEM DE CONFIRMAÇÃO
SELECT 
    '🔒 CORREÇÃO DE SEGURANÇA CONCLUÍDA' as status,
    'RLS habilitado em todas as tabelas críticas' as message,
    'Políticas baseadas na estrutura real das tabelas' as details;