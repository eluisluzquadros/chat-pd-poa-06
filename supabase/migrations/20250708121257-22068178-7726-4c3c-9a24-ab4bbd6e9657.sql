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

-- Função para validar acesso OAuth (será chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.validate_oauth_access(user_email text, user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_data record;
  result json;
BEGIN
  -- Verificar se o usuário existe na tabela user_accounts
  SELECT * INTO account_data FROM public.user_accounts 
  WHERE email = user_email;
  
  IF account_data IS NULL THEN
    result := json_build_object(
      'has_access', false,
      'reason', 'user_not_found',
      'message', 'Conta não encontrada. Solicite acesso através do formulário de interesse.'
    );
  ELSIF NOT account_data.active THEN
    result := json_build_object(
      'has_access', false,
      'reason', 'account_inactive',
      'message', 'Conta inativa. Entre em contato com o administrador.'
    );
  ELSE
    result := json_build_object(
      'has_access', true,
      'user_data', row_to_json(account_data)
    );
  END IF;
  
  RETURN result;
END;
$$;