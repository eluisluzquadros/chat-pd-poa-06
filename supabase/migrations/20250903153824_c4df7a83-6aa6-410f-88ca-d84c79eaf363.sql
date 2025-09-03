-- CORREÇÃO DEFINITIVA DOS ROLES DO USUÁRIO ADMIN
-- Garantir que o role está correto em todas as tabelas

-- 1. Verificar e corrigir role na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  'd430b2b5-130a-4e02-a8aa-35ee4e8362d5'::uuid as user_id,
  'admin' as role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5' 
  AND role = 'admin'
);

-- 2. Remover possíveis roles incorretos do usuário admin
DELETE FROM public.user_roles 
WHERE user_id = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5' 
AND role != 'admin';

-- 3. Atualizar role na tabela user_accounts
UPDATE public.user_accounts 
SET 
  role = 'admin',
  updated_at = now()
WHERE user_id = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5';

-- 4. Inserir na user_accounts se não existir
INSERT INTO public.user_accounts (user_id, email, full_name, role, is_active)
SELECT 
  'd430b2b5-130a-4e02-a8aa-35ee4e8362d5'::uuid,
  'admin@chat-pd-poa.org',
  'Everton Quadros',
  'admin',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_accounts 
  WHERE user_id = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5'
);

-- 5. Verificar resultado final
SELECT 
  'VERIFICAÇÃO FINAL' as status,
  ur.user_id,
  ur.role as user_roles_role,
  ua.role as user_accounts_role,
  ua.email,
  ua.full_name,
  ua.is_active
FROM public.user_roles ur
INNER JOIN public.user_accounts ua ON ua.user_id = ur.user_id
WHERE ur.user_id = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5';