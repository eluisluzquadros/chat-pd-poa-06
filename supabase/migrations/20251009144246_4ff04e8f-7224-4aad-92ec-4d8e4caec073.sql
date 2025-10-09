-- Corrigir foreign key constraint para permitir cascade delete
-- Isso resolve o erro ao tentar deletar usuários órfãos durante conversão de manifestações

-- Remover constraint antiga
ALTER TABLE token_usage 
DROP CONSTRAINT IF EXISTS token_usage_session_id_fkey;

-- Recriar com ON DELETE CASCADE
ALTER TABLE token_usage 
ADD CONSTRAINT token_usage_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES chat_sessions(id) 
ON DELETE CASCADE;

-- Adicionar comentário para documentar a mudança
COMMENT ON CONSTRAINT token_usage_session_id_fkey ON token_usage IS 
'Foreign key com CASCADE para permitir limpeza automática quando sessões são deletadas';