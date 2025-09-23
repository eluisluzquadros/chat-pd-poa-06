-- CORREÇÃO DEFINITIVA DO SISTEMA DE ROLES
-- Atualizar metadados do usuário admin atual

-- 1. Definir role admin nos metadados do Supabase Auth
UPDATE auth.users 
SET 
  app_metadata = COALESCE(app_metadata, '{}') || '{"role": "admin"}'::jsonb,
  updated_at = now()
WHERE email = 'admin@chat-pd-poa.org';

-- 2. Garantir que role existe na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id as user_id,
  'admin' as role
FROM auth.users 
WHERE email = 'admin@chat-pd-poa.org'
ON CONFLICT (user_id, role) 
DO NOTHING;

-- 3. Atualizar role na tabela user_accounts
UPDATE public.user_accounts 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'admin@chat-pd-poa.org';

-- 4. Verificar resultado final
SELECT 
  'RESULTADO DA CORREÇÃO' as status,
  u.email,
  u.app_metadata->>'role' as app_metadata_role,
  ur.role as user_roles_role,
  ua.role as user_accounts_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.user_accounts ua ON ua.user_id = u.id
WHERE u.email = 'admin@chat-pd-poa.org';