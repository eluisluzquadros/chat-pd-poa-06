-- Completar conta existente do usuário quadros.hg@gmail.com
-- Adicionar role 'user' ao auth_user_id correto
INSERT INTO user_roles (user_id, role)
VALUES ('e12b39ac-27be-478e-ac0c-16aac7ef17b9', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Atualizar manifestação de interesse para 'converted'
UPDATE interest_manifestations
SET 
  account_created = true,
  status = 'converted',
  updated_at = NOW()
WHERE id = '7eec018a-60bb-4255-b704-6a8eaf58d9ae';