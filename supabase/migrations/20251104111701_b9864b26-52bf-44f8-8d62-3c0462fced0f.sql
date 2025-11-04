-- ============================================
-- FASE 1: LIMPEZA DE DADOS ÓRFÃOS E PROBLEMÁTICOS
-- ============================================

-- Limpar audit_log órfãos (registros sem usuário correspondente)
DELETE FROM audit_log
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Limpar chat_history órfãos
DELETE FROM chat_history
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Limpar message_feedback órfãos  
DELETE FROM message_feedback
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Limpar token_usage órfãos
DELETE FROM token_usage
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Deletar logs de debug dos dois usuários problemáticos
DELETE FROM ios_debug_logs 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('tchelopoa@proton.me', 'jvcunha031220@gmail.com')
);

DELETE FROM debug_logs 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('tchelopoa@proton.me', 'jvcunha031220@gmail.com')
);

-- ============================================
-- FASE 2: CORREÇÃO DAS FOREIGN KEYS
-- ============================================

-- Tabelas de logs e debug (ON DELETE CASCADE)
ALTER TABLE ios_debug_logs 
DROP CONSTRAINT IF EXISTS ios_debug_logs_user_id_fkey,
ADD CONSTRAINT ios_debug_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE debug_logs 
DROP CONSTRAINT IF EXISTS debug_logs_user_id_fkey,
ADD CONSTRAINT debug_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Tabelas principais (ON DELETE CASCADE)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE user_accounts 
DROP CONSTRAINT IF EXISTS user_accounts_user_id_fkey,
ADD CONSTRAINT user_accounts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE chat_sessions 
DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey,
ADD CONSTRAINT chat_sessions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Tabelas de auditoria e histórico (ON DELETE SET NULL para preservar histórico)
ALTER TABLE audit_log 
DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey,
ADD CONSTRAINT audit_log_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE chat_history 
DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey,
ADD CONSTRAINT chat_history_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE message_feedback 
DROP CONSTRAINT IF EXISTS message_feedback_user_id_fkey,
ADD CONSTRAINT message_feedback_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE token_usage 
DROP CONSTRAINT IF EXISTS token_usage_user_id_fkey,
ADD CONSTRAINT token_usage_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;