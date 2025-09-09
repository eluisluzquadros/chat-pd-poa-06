-- ============================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA CHAT
-- ============================================

-- 1. REMOVER POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Supervisors can view all chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can manage their own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can create own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON chat_history;

DROP POLICY IF EXISTS "Supervisors can view all chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

-- 2. CRIAR POLÍTICAS BALANCEADAS PARA CHAT_HISTORY
-- Usuários podem ver seu próprio histórico + supervisors/admins veem tudo
CREATE POLICY "Users and supervisors can view chat history" 
ON chat_history FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin());

-- Usuários podem criar seu próprio histórico
CREATE POLICY "Users can create own chat history" 
ON chat_history FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar seu próprio histórico + supervisors/admins podem atualizar tudo
CREATE POLICY "Users and supervisors can update chat history" 
ON chat_history FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin())
WITH CHECK (user_id = auth.uid() OR is_supervisor_or_admin());

-- Usuários podem deletar seu próprio histórico + supervisors/admins podem deletar tudo
CREATE POLICY "Users and supervisors can delete chat history" 
ON chat_history FOR DELETE 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin());

-- 3. CRIAR POLÍTICAS BALANCEADAS PARA CHAT_SESSIONS
-- Usuários podem ver suas próprias sessões + supervisors/admins veem tudo
CREATE POLICY "Users and supervisors can view chat sessions" 
ON chat_sessions FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin());

-- Usuários podem criar suas próprias sessões
CREATE POLICY "Users can create own chat sessions" 
ON chat_sessions FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar suas próprias sessões + supervisors/admins podem atualizar tudo
CREATE POLICY "Users and supervisors can update chat sessions" 
ON chat_sessions FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin())
WITH CHECK (user_id = auth.uid() OR is_supervisor_or_admin());

-- Usuários podem deletar suas próprias sessões + supervisors/admins podem deletar tudo
CREATE POLICY "Users and supervisors can delete chat sessions" 
ON chat_sessions FOR DELETE 
TO authenticated
USING (user_id = auth.uid() OR is_supervisor_or_admin());

-- 4. VERIFICAR STATUS DAS POLÍTICAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('chat_history', 'chat_sessions')
ORDER BY tablename, policyname;