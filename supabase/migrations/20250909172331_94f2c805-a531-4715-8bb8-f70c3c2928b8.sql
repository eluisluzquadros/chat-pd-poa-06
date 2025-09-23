-- ============================================
-- CRIAR POLÍTICAS PARA TABELAS COM RLS HABILITADO 
-- Resolver alertas "RLS Enabled No Policy"
-- ============================================

-- Políticas para MESSAGES (baseado em session_id)
CREATE POLICY "Users can access messages from own sessions" ON public.messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- Políticas para CHAT_MEMORY (baseado em session_id)
CREATE POLICY "Users can access chat memory from own sessions" ON public.chat_memory
    FOR ALL USING (
        session_id IN (
            SELECT id::text FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- Políticas para SESSIONS (acesso geral para usuários autenticados por enquanto)
CREATE POLICY "Authenticated users can access sessions" ON public.sessions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Verificar resultado das políticas criadas
SELECT 
    tablename,
    COUNT(*) as policy_count,
    '✅ Políticas criadas' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('messages', 'chat_memory', 'sessions')
GROUP BY tablename
ORDER BY tablename;