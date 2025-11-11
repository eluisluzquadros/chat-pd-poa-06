-- FASE 5: Sistema de Visibilidade Público/Interno

-- Adicionar campos de visibilidade à tabela intelligence_alerts
ALTER TABLE intelligence_alerts 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('public', 'internal')),
ADD COLUMN IF NOT EXISTS visibility_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS visibility_approved_at TIMESTAMPTZ;

-- Adicionar campos de visibilidade à tabela security_incident_reports
ALTER TABLE security_incident_reports 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('public', 'internal')),
ADD COLUMN IF NOT EXISTS visibility_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS visibility_approved_at TIMESTAMPTZ;

-- Adicionar comentários para documentação
COMMENT ON COLUMN intelligence_alerts.visibility IS 'Controla se o incidente é visível publicamente (public) ou apenas para admins/supervisors (internal)';
COMMENT ON COLUMN security_incident_reports.visibility IS 'Controla se o relatório é visível publicamente (public) ou apenas para admins/supervisors (internal)';

-- Criar índices para melhor performance nas queries
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_visibility ON intelligence_alerts(visibility);
CREATE INDEX IF NOT EXISTS idx_security_incident_reports_visibility ON security_incident_reports(visibility);

-- Atualizar RLS policies para intelligence_alerts
DROP POLICY IF EXISTS "Public can view public alerts" ON intelligence_alerts;
CREATE POLICY "Public can view public alerts"
ON intelligence_alerts
FOR SELECT
USING (visibility = 'public');

-- Atualizar RLS policies para security_incident_reports  
DROP POLICY IF EXISTS "Public can view public incidents" ON security_incident_reports;
CREATE POLICY "Public can view public incidents"
ON security_incident_reports
FOR SELECT
USING (visibility = 'public');