-- Habilitar RLS nas tabelas que não têm (excluindo views)
ALTER TABLE bairros_risco_desastre ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases_backup_clean ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_token_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas para visualização pública onde apropriado
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

-- Políticas para tabelas de sistema (apenas supervisors/admins)
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

-- Políticas para QA system
CREATE POLICY "System can access qa_automated_reports" 
ON qa_automated_reports 
FOR ALL 
USING (true);

CREATE POLICY "System can access qa_token_usage" 
ON qa_token_usage 
FOR ALL 
USING (true);

CREATE POLICY "System can access qa_validation_token_stats" 
ON qa_validation_token_stats 
FOR ALL 
USING (true);

-- Políticas para document chunks e embeddings
CREATE POLICY "Public read access to document_chunks" 
ON document_chunks 
FOR SELECT 
USING (true);

CREATE POLICY "Public read access to document_embeddings" 
ON document_embeddings 
FOR SELECT 
USING (true);

-- Política para messages
CREATE POLICY "Public read access to messages" 
ON messages 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert messages" 
ON messages 
FOR INSERT 
WITH CHECK (true);

-- Políticas para backups de QA (apenas supervisors)
CREATE POLICY "Supervisors can view qa_test_cases_backup" 
ON qa_test_cases_backup 
FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "Supervisors can view qa_test_cases_backup_clean" 
ON qa_test_cases_backup_clean 
FOR SELECT 
USING (is_supervisor_or_admin());