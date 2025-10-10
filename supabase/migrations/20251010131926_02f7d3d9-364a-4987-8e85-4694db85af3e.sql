-- Criar tabela de logs de debug para iOS
CREATE TABLE IF NOT EXISTS ios_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  log_type TEXT NOT NULL, -- 'platform_detection', 'xhr_start', 'xhr_success', 'xhr_error', 'json_parse', 'error'
  log_level TEXT NOT NULL, -- 'info', 'warn', 'error'
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  error_name TEXT,
  error_message TEXT,
  stack_trace TEXT
);

-- Criar índices para consultas rápidas
CREATE INDEX idx_ios_debug_logs_session ON ios_debug_logs(session_id);
CREATE INDEX idx_ios_debug_logs_created ON ios_debug_logs(created_at DESC);
CREATE INDEX idx_ios_debug_logs_type ON ios_debug_logs(log_type);
CREATE INDEX idx_ios_debug_logs_level ON ios_debug_logs(log_level);

-- RLS policies
ALTER TABLE ios_debug_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all iOS debug logs"
  ON ios_debug_logs
  FOR SELECT
  USING (is_admin());

-- Qualquer usuário autenticado pode inserir logs (para telemetria)
CREATE POLICY "Authenticated users can insert iOS debug logs"
  ON ios_debug_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);