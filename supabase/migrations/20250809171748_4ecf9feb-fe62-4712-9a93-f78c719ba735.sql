-- Criar tabela para logs de validação SQL
CREATE TABLE IF NOT EXISTS sql_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  table_used VARCHAR(100),
  record_count INTEGER DEFAULT 0,
  is_valid BOOLEAN DEFAULT false,
  issues TEXT[],
  recommendations TEXT[],
  confidence DECIMAL(3,2) DEFAULT 0.0,
  should_alert BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para relatórios de cobertura de tabelas
CREATE TABLE IF NOT EXISTS table_coverage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_data JSONB NOT NULL,
  alert_level VARCHAR(20) DEFAULT 'info',
  total_queries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sql_validation_logs_created_at ON sql_validation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sql_validation_logs_query_type ON sql_validation_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_sql_validation_logs_table_used ON sql_validation_logs(table_used);
CREATE INDEX IF NOT EXISTS idx_sql_validation_logs_is_valid ON sql_validation_logs(is_valid);

CREATE INDEX IF NOT EXISTS idx_table_coverage_reports_created_at ON table_coverage_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_table_coverage_reports_alert_level ON table_coverage_reports(alert_level);

-- Habilitar RLS
ALTER TABLE sql_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_coverage_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para visualização por supervisores/admins
CREATE POLICY "Supervisors can view validation logs" 
ON sql_validation_logs 
FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "System can insert validation logs" 
ON sql_validation_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Supervisors can view coverage reports" 
ON table_coverage_reports 
FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "System can insert coverage reports" 
ON table_coverage_reports 
FOR INSERT 
WITH CHECK (true);