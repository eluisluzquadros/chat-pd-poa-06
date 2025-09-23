-- ============================================
-- CORREÇÃO ESPECÍFICA PARA POLÍTICAS RLS DE CHAT
-- ============================================

-- 1. VERIFICAR QUAIS POLÍTICAS EXISTEM
DO $$ 
DECLARE
    pol_exists boolean;
BEGIN
    -- Verificar se a política restritiva de supervisor existe
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'chat_history' 
          AND policyname = 'Supervisors can view all chat history'
    ) INTO pol_exists;
    
    -- Se a política restritiva existe, substituir por uma balanceada
    IF pol_exists THEN
        DROP POLICY "Supervisors can view all chat history" ON chat_history;
        
        CREATE POLICY "Users and supervisors can view chat history" 
        ON chat_history FOR SELECT 
        TO authenticated
        USING (user_id = auth.uid() OR is_supervisor_or_admin());
        
        RAISE NOTICE 'Política de chat_history corrigida - agora usuários podem ver seu próprio histórico';
    END IF;
    
    -- Repetir processo para chat_sessions
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'chat_sessions' 
          AND policyname = 'Supervisors can view all chat sessions'
    ) INTO pol_exists;
    
    IF pol_exists THEN
        DROP POLICY "Supervisors can view all chat sessions" ON chat_sessions;
        
        CREATE POLICY "Users and supervisors can view chat sessions" 
        ON chat_sessions FOR SELECT 
        TO authenticated
        USING (user_id = auth.uid() OR is_supervisor_or_admin());
        
        RAISE NOTICE 'Política de chat_sessions corrigida - agora usuários podem ver suas próprias sessões';
    END IF;
END $$;

-- 2. GARANTIR QUE USUÁRIOS PODEM CRIAR E GERENCIAR SEUS PRÓPRIOS DADOS
-- Criar política de insert para chat_history se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'chat_history' 
          AND policyname = 'Users can create own chat history'
    ) THEN
        CREATE POLICY "Users can create own chat history" 
        ON chat_history FOR INSERT 
        TO authenticated
        WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE 'Política de INSERT para chat_history criada';
    END IF;
END $$;

-- Criar política de insert para chat_sessions se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'chat_sessions' 
          AND policyname = 'Users can create own chat sessions'
    ) THEN
        CREATE POLICY "Users can create own chat sessions" 
        ON chat_sessions FOR INSERT 
        TO authenticated
        WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE 'Política de INSERT para chat_sessions criada';
    END IF;
END $$;

-- 3. VERIFICAR STATUS FINAL
SELECT 
    'chat_history' as tabela,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%user_id = auth.uid()%' THEN 'Permite usuários próprios ✅'
        WHEN qual LIKE '%is_supervisor_or_admin()%' THEN 'Permite admins/supervisors ✅' 
        ELSE 'Outras regras'
    END as regra_aplicada
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'chat_history'

UNION ALL

SELECT 
    'chat_sessions' as tabela,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%user_id = auth.uid()%' THEN 'Permite usuários próprios ✅'
        WHEN qual LIKE '%is_supervisor_or_admin()%' THEN 'Permite admins/supervisors ✅'
        ELSE 'Outras regras'
    END as regra_aplicada
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'chat_sessions'
ORDER BY tabela, cmd, policyname;