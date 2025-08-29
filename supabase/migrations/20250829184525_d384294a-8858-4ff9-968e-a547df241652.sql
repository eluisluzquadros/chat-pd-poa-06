-- Alterar role do usuário tester@chatpdpoa.org de admin para analyst
UPDATE user_roles 
SET role = 'analyst', updated_at = NOW() 
WHERE user_id = 'e1473380-384b-4350-ad9a-9b8b93d4a525' AND role = 'admin';

-- Atualizar role na tabela user_accounts para manter consistência
UPDATE user_accounts 
SET role = 'analyst', updated_at = NOW() 
WHERE user_id = 'e1473380-384b-4350-ad9a-9b8b93d4a525';