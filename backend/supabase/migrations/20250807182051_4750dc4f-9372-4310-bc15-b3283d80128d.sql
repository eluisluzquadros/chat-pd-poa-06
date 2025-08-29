-- Habilitar RLS em tabelas críticas que estão expostas sem proteção
ALTER TABLE qa_automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_quality_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_token_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas para tabelas que precisam
CREATE POLICY "Enable read access for authenticated users" ON qa_automated_reports FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON qa_quality_monitoring FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON qa_validation_token_stats FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON quality_alerts FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON quality_metrics FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON quality_metrics_daily FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON quality_metrics_hourly FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON query_cache FOR SELECT USING (true);

-- Habilitar RLS em outras tabelas importantes
ALTER TABLE benchmark_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_feedback_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE bairros_risco_desastre ENABLE ROW LEVEL SECURITY;

-- Criar políticas para tabelas de acesso público
CREATE POLICY "Enable read access for all users" ON benchmark_analysis FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cache_effectiveness FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON cost_projections FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON document_chunks FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON document_embeddings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON feedback_statistics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON model_feedback_stats FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON popular_queries FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON regime_urbanistico FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON bairros_risco_desastre FOR SELECT USING (true);