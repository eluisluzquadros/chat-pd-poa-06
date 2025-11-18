-- Criar índices de performance para queries de segurança

-- Acelerar busca por automações ativas e próxima execução
CREATE INDEX IF NOT EXISTS idx_automation_configs_active 
ON security_automation_configs(is_enabled, next_run_at) 
WHERE is_enabled = true;

-- Acelerar busca por incidentes recentes por data e nível de ameaça
CREATE INDEX IF NOT EXISTS idx_incident_reports_recent 
ON security_incident_reports(created_at DESC, threat_level);

-- Acelerar busca por logs de automação por configuração e data
CREATE INDEX IF NOT EXISTS idx_automation_logs_config 
ON security_automation_logs(config_id, started_at DESC);

-- Acelerar busca por alertas de inteligência recentes
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_recent
ON intelligence_alerts(triggered_at DESC, severity);

-- Acelerar busca por validações de segurança
CREATE INDEX IF NOT EXISTS idx_security_validation_runs_recent
ON security_validation_runs(started_at DESC, status);

-- Comentários explicativos
COMMENT ON INDEX idx_automation_configs_active IS 'Otimiza busca de configurações ativas para o scheduler';
COMMENT ON INDEX idx_incident_reports_recent IS 'Otimiza dashboard de incidentes recentes e relatórios';
COMMENT ON INDEX idx_automation_logs_config IS 'Otimiza histórico de automações por configuração';
COMMENT ON INDEX idx_intelligence_alerts_recent IS 'Otimiza busca de alertas para relatórios semanais';
COMMENT ON INDEX idx_security_validation_runs_recent IS 'Otimiza busca de simulações recentes';
