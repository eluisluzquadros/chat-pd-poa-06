-- Adicionar colunas para rastrear método de autenticação e verificação de email
ALTER TABLE public.user_accounts 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Atualizar usuários existentes
UPDATE public.user_accounts 
SET email_verified = true 
WHERE email_verified IS NULL OR email_verified = false;

-- Criar índice para auth_provider
CREATE INDEX IF NOT EXISTS idx_user_accounts_auth_provider 
ON public.user_accounts(auth_provider);

-- Comentário explicativo
COMMENT ON COLUMN public.user_accounts.auth_provider IS 'Método de autenticação: email, google, etc';
COMMENT ON COLUMN public.user_accounts.email_verified IS 'Se o email foi verificado pelo provedor de autenticação';