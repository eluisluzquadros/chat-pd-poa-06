-- Verificar se já existe um usuário admin e criar um usuário de teste se necessário
DO $$
BEGIN
  -- Verificar se a tabela user_roles tem dados
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
    -- Inserir um usuário admin de teste se nenhum existir
    INSERT INTO user_roles (user_id, role)
    VALUES (
      (SELECT id FROM auth.users LIMIT 1), -- Pega o primeiro usuário se existir
      'admin'
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Se não houver usuários, criar os registros básicos esperados
    INSERT INTO user_accounts (user_id, email, full_name, role)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
    FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM user_accounts)
    LIMIT 1;
  END IF;
END $$;

-- Garantir que temos pelo menos um admin funcional
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin');

-- Verificar o resultado
SELECT 
  u.email,
  ur.role as user_role,
  ua.role as account_role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN user_accounts ua ON u.id = ua.user_id
LIMIT 5;