-- Criar função para validar acesso de usuários OAuth
CREATE OR REPLACE FUNCTION auth.validate_oauth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas verificar para usuários OAuth (Google, etc.)
  IF NEW.app_metadata->>'provider' IN ('google') THEN
    -- Verificar se o usuário existe na tabela user_accounts
    IF NOT EXISTS (
      SELECT 1 FROM public.user_accounts 
      WHERE email = NEW.email AND active = true
    ) THEN
      -- Bloquear a criação/login do usuário
      RAISE EXCEPTION 'Acesso restrito a usuários previamente cadastrados. Email: %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para validar usuários antes do login OAuth
DROP TRIGGER IF EXISTS validate_oauth_user_trigger ON auth.users;
CREATE TRIGGER validate_oauth_user_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.validate_oauth_user();

-- Função para verificar se um usuário tem acesso (melhorada)
CREATE OR REPLACE FUNCTION public.user_has_platform_access(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_accounts 
    WHERE email = user_email AND active = true
  );
$$;