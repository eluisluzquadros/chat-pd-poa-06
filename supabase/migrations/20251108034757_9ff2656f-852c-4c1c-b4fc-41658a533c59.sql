-- Adicionar coluna user_agent na tabela auth_attempts
ALTER TABLE auth_attempts 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Limpar alertas antigos com dados incorretos
DELETE FROM intelligence_alerts 
WHERE data->>'user_email' = 'desconhecido';