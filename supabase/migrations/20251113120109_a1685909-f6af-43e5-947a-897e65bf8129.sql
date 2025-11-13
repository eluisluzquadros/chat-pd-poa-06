-- Limpar tabelas existentes que podem estar incompletas
DROP TABLE IF EXISTS security_automation_logs CASCADE;
DROP TABLE IF EXISTS security_automation_configs CASCADE;
DROP TABLE IF EXISTS security_notifications CASCADE;

-- FASE 4: Tabela de Notificações de Segurança
CREATE TABLE security_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  has_attachment BOOLEAN DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  related_alert_id UUID,
  related_report_id UUID,
  related_run_id UUID,
  sent_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_notifications_status ON security_notifications(status);
CREATE INDEX idx_security_notifications_type ON security_notifications(notification_type);
CREATE INDEX idx_security_notifications_created ON security_notifications(created_at DESC);

-- FASE 3: Tabelas de Automação de Segurança
CREATE TABLE security_automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL,
  config_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  schedule_type TEXT NOT NULL,
  schedule_time TIME NOT NULL,
  schedule_days INTEGER[],
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  simulation_test_count INTEGER,
  simulation_randomize BOOLEAN DEFAULT true,
  simulation_agent_id UUID,
  simulation_categories TEXT[],
  monitoring_time_window_hours INTEGER,
  monitoring_min_severity TEXT,
  email_notifications BOOLEAN DEFAULT true,
  notification_emails TEXT[],
  auto_generate_pdf BOOLEAN DEFAULT true,
  auto_send_weekly_report BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automation_enabled ON security_automation_configs(is_enabled, next_run_at);

CREATE TABLE security_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES security_automation_configs(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  results JSONB,
  error_message TEXT,
  related_run_id UUID,
  alerts_created INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automation_logs_config ON security_automation_logs(config_id, started_at DESC);
CREATE INDEX idx_automation_logs_status ON security_automation_logs(status);