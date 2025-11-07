-- Adicionar políticas RLS para permitir service role gerenciar alertas e relatórios
-- Isso corrige o problema de alertas não serem criados pelos edge functions

-- Para intelligence_alerts
CREATE POLICY "Service role can manage intelligence alerts"
ON intelligence_alerts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Para security_incident_reports  
CREATE POLICY "Service role can manage security reports"
ON security_incident_reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);