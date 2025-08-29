-- Remover roles duplicados mantendo apenas o role admin
DELETE FROM user_roles 
WHERE role = 'user' 
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Garantir que não haverá duplicatas futuras criando uma constraint única
DROP INDEX IF EXISTS idx_user_roles_unique;
CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, role);