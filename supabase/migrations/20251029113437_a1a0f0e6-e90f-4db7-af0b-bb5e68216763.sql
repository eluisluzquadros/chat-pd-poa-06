-- ETAPA 1: Criar tabela de debug_logs para telemetria persistente
CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_session_id ON debug_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_debug_logs_user_id ON debug_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON debug_logs(level);

-- RLS policies
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir seus próprios logs
CREATE POLICY "Users can insert their own logs"
  ON debug_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver seus próprios logs
CREATE POLICY "Users can view their own logs"
  ON debug_logs FOR SELECT
  USING (auth.uid() = user_id);