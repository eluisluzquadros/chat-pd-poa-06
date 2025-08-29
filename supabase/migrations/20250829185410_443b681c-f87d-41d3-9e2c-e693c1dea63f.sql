-- Corrigir roles no sistema de autorização
-- Alterar 'user' para 'citizen' (role padrão correto)
UPDATE user_roles 
SET role = 'citizen', updated_at = NOW() 
WHERE role = 'user';

-- Atualizar user_accounts também para manter consistência
UPDATE user_accounts 
SET role = 'citizen', updated_at = NOW() 
WHERE role = 'user';