-- ============================================
-- LIMPAR E RECRIAR POLÍTICAS 
-- ============================================

-- Remover políticas existentes que podem estar duplicadas
DROP POLICY IF EXISTS "Users can access messages from own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can access chat memory from own sessions" ON public.chat_memory;
DROP POLICY IF EXISTS "Authenticated users can access sessions" ON public.sessions;

-- Recriar políticas corretas
CREATE POLICY "Users can access messages from own sessions" ON public.messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access chat memory from own sessions" ON public.chat_memory
    FOR ALL USING (
        session_id IN (
            SELECT id::text FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can access sessions" ON public.sessions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Verificar status final das correções de segurança
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    COALESCE(policy_count, 0) as policies,
    CASE 
        WHEN rowsecurity AND COALESCE(policy_count, 0) > 0 THEN '✅ Seguro'
        WHEN rowsecurity AND COALESCE(policy_count, 0) = 0 THEN '⚠️ RLS sem políticas'
        WHEN NOT rowsecurity THEN '❌ RLS desabilitado'
    END as security_status
FROM pg_tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' 
  AND t.tablename IN (
    'qa_test_cases',
    'regime_urbanistico_consolidado',
    'messages',
    'chat_memory', 
    'sessions'
  )
ORDER BY t.tablename;