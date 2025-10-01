-- Remove a coluna role da tabela user_accounts que está causando conflito
-- A role deve ser gerenciada apenas pela tabela user_roles com o enum app_role

ALTER TABLE public.user_accounts 
DROP COLUMN IF EXISTS role;

-- Adicionar índice para melhorar performance nas consultas de validação OAuth
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);