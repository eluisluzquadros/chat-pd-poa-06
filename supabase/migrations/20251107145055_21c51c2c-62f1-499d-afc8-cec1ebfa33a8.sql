-- Tabela para armazenar relatórios de incidentes de segurança
CREATE TABLE public.security_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT UNIQUE NOT NULL,
  alert_id UUID REFERENCES public.intelligence_alerts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  threat_level TEXT NOT NULL CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  threat_score NUMERIC CHECK (threat_score >= 0 AND threat_score <= 5),
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para otimizar queries
CREATE INDEX idx_security_reports_alert_id ON public.security_incident_reports(alert_id);
CREATE INDEX idx_security_reports_session_id ON public.security_incident_reports(session_id);
CREATE INDEX idx_security_reports_status ON public.security_incident_reports(status);
CREATE INDEX idx_security_reports_threat_level ON public.security_incident_reports(threat_level);
CREATE INDEX idx_security_reports_generated_at ON public.security_incident_reports(generated_at DESC);

-- Tabela para log de notificações de segurança
CREATE TABLE public.security_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.intelligence_alerts(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack', 'webhook', 'sms')),
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed', 'bounced')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX idx_security_notifications_alert_id ON public.security_notifications(alert_id);
CREATE INDEX idx_security_notifications_status ON public.security_notifications(status);
CREATE INDEX idx_security_notifications_sent_at ON public.security_notifications(sent_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_security_reports_updated_at
  BEFORE UPDATE ON public.security_incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_updated_at();

-- RLS Policies para security_incident_reports
ALTER TABLE public.security_incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security incident reports"
  ON public.security_incident_reports
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view security incident reports"
  ON public.security_incident_reports
  FOR SELECT
  TO authenticated
  USING (is_supervisor_or_admin());

-- RLS Policies para security_notifications
ALTER TABLE public.security_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security notifications"
  ON public.security_notifications
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view security notifications"
  ON public.security_notifications
  FOR SELECT
  TO authenticated
  USING (is_supervisor_or_admin());