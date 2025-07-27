-- Adicionar políticas RLS específicas para o usuário demo resolver problemas de autenticação

-- Para chat_sessions
CREATE POLICY "Demo user can manage chat sessions" 
ON public.chat_sessions 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid)
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Para chat_history  
CREATE POLICY "Demo user can manage chat history"
ON public.chat_history
FOR ALL
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid) 
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);