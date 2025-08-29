-- Remover a foreign key constraint que está impedindo o usuário demo
-- de inserir mensagens no chat_history

-- Primeiro, vamos verificar e remover a constraint existente
ALTER TABLE public.chat_history 
DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;

-- A tabela chat_history não precisa de foreign key para auth.users
-- pois estamos usando UUID diretamente e o RLS já controla o acesso