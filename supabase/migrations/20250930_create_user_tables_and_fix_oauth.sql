-- Migration: Create user tables and fix OAuth validation function
-- Date: 2025-09-30
-- Description: Creates user_accounts and user_roles tables and fixes validate_oauth_access function

-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'citizen',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Fix the validate_oauth_access function to avoid column name ambiguity
CREATE OR REPLACE FUNCTION public.validate_oauth_access(user_email text, user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  account_data record;
  result json;
BEGIN
  -- Verificar se o usuário existe na tabela user_accounts
  -- IMPORTANTE: Validar TANTO email quanto user_id para evitar impersonação
  -- Usando alias para evitar ambiguidade de nomes
  SELECT * INTO account_data FROM public.user_accounts AS ua
  WHERE ua.email = user_email AND ua.user_id = validate_oauth_access.user_id;
  
  IF account_data IS NULL THEN
    -- Verificar se existe conta com este email mas user_id diferente
    IF EXISTS (SELECT 1 FROM public.user_accounts AS ua WHERE ua.email = user_email) THEN
      result := json_build_object(
        'has_access', false,
        'reason', 'user_id_mismatch',
        'message', 'Conta existe mas com identidade diferente. Entre em contato com o suporte.'
      );
    ELSE
      result := json_build_object(
        'has_access', false,
        'reason', 'user_not_found',
        'message', 'Conta não encontrada. Solicite acesso através do formulário de interesse.'
      );
    END IF;
  ELSIF NOT account_data.is_active THEN
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
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_oauth_access(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_oauth_access(text, uuid) TO anon;

-- Enable RLS on user tables
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_accounts
CREATE POLICY "Users can view their own account" ON public.user_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all accounts" ON public.user_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Insert admin user if it doesn't exist (update with your actual admin email)
INSERT INTO public.user_accounts (user_id, email, full_name, role, is_active)
SELECT 
  'ADMIN_USER_ID_PLACEHOLDER'::uuid,
  'admin@chat-pd-poa.org',
  'Administrator',
  'admin',
  true
ON CONFLICT (email) DO NOTHING;

-- Insert admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  'ADMIN_USER_ID_PLACEHOLDER'::uuid,
  'admin'
ON CONFLICT DO NOTHING;

-- Add comment to explain the tables
COMMENT ON TABLE public.user_accounts IS 'Stores user account information for OAuth and manual login';
COMMENT ON TABLE public.user_roles IS 'Stores additional roles for users (many-to-many relationship)';
COMMENT ON FUNCTION public.validate_oauth_access(text, uuid) IS 'Validates OAuth user access and returns account information';
