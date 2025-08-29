-- Habilitar RLS apenas nas tabelas principais (não views)
ALTER TABLE bairros_risco_desastre ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas
CREATE POLICY "Public read access to bairros_risco_desastre" 
ON bairros_risco_desastre 
FOR SELECT 
USING (true);

CREATE POLICY "Public read access to regime_urbanistico" 
ON regime_urbanistico 
FOR SELECT 
USING (true);

CREATE POLICY "Public read access to document_sections" 
ON document_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Supervisors can view quality_metrics" 
ON quality_metrics 
FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "System can insert quality_metrics" 
ON quality_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Supervisors can view quality_alerts" 
ON quality_alerts 
FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "System can insert quality_alerts" 
ON quality_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update quality_alerts" 
ON quality_alerts 
FOR UPDATE 
USING (true);

CREATE POLICY "System can access query_cache" 
ON query_cache 
FOR ALL 
USING (true);