-- Criação de tabelas para o sistema Quality V3 e Benchmark V3

-- Tabela para execuções de validação dual (v1 + v2)
CREATE TABLE qa_dual_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  v1_run_id UUID REFERENCES qa_validation_runs(id),
  v2_run_id UUID,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  v1_metrics JSONB DEFAULT '{}',
  v2_metrics JSONB DEFAULT '{}',
  comparison_results JSONB DEFAULT '{}',
  total_tests INTEGER DEFAULT 0,
  v1_passed_tests INTEGER DEFAULT 0,
  v2_passed_tests INTEGER DEFAULT 0,
  v1_accuracy NUMERIC(5,4) DEFAULT 0,
  v2_accuracy NUMERIC(5,4) DEFAULT 0,
  accuracy_difference NUMERIC(5,4) DEFAULT 0,
  avg_response_time_v1 INTEGER DEFAULT 0,
  avg_response_time_v2 INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para comparações diretas entre versões RAG
CREATE TABLE rag_version_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dual_run_id UUID REFERENCES qa_dual_validation_runs(id),
  test_case_id INTEGER REFERENCES qa_test_cases(id),
  query_text TEXT NOT NULL,
  v1_response TEXT,
  v2_response TEXT,
  v1_response_time INTEGER DEFAULT 0,
  v2_response_time INTEGER DEFAULT 0,
  v1_is_correct BOOLEAN DEFAULT FALSE,
  v2_is_correct BOOLEAN DEFAULT FALSE,
  v1_accuracy_score NUMERIC(5,4) DEFAULT 0,
  v2_accuracy_score NUMERIC(5,4) DEFAULT 0,
  similarity_score NUMERIC(5,4) DEFAULT 0,
  difference_analysis JSONB DEFAULT '{}',
  quality_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para resultados específicos do benchmark V3
CREATE TABLE benchmark_v3_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_session_id UUID NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  test_category TEXT NOT NULL,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  avg_quality_score NUMERIC(5,4) DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  avg_cost_per_query NUMERIC(10,6) DEFAULT 0,
  success_rate NUMERIC(5,4) DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  optimization_suggestions JSONB DEFAULT '{}',
  trend_analysis JSONB DEFAULT '{}',
  historical_comparison JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para insights avançados de qualidade V3
CREATE TABLE quality_insights_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('accuracy_gap', 'performance_difference', 'consistency_issue', 'optimization_opportunity')),
  rag_version TEXT NOT NULL CHECK (rag_version IN ('v1', 'v2', 'both')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  impact_score NUMERIC(5,4) DEFAULT 0,
  confidence_score NUMERIC(5,4) DEFAULT 0,
  data_points JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_qa_dual_validation_runs_status ON qa_dual_validation_runs(status);
CREATE INDEX idx_qa_dual_validation_runs_created_at ON qa_dual_validation_runs(created_at DESC);
CREATE INDEX idx_rag_version_comparisons_dual_run_id ON rag_version_comparisons(dual_run_id);
CREATE INDEX idx_benchmark_v3_results_session_id ON benchmark_v3_results(benchmark_session_id);
CREATE INDEX idx_benchmark_v3_results_model ON benchmark_v3_results(model);
CREATE INDEX idx_quality_insights_v3_type ON quality_insights_v3(insight_type);
CREATE INDEX idx_quality_insights_v3_severity ON quality_insights_v3(severity);

-- RLS Policies
ALTER TABLE qa_dual_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_version_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_v3_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_insights_v3 ENABLE ROW LEVEL SECURITY;

-- Políticas para qa_dual_validation_runs
CREATE POLICY "Admins can manage dual validation runs" 
ON qa_dual_validation_runs FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view dual validation runs" 
ON qa_dual_validation_runs FOR SELECT 
USING (is_supervisor_or_admin());

-- Políticas para rag_version_comparisons
CREATE POLICY "Admins can manage version comparisons" 
ON rag_version_comparisons FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view version comparisons" 
ON rag_version_comparisons FOR SELECT 
USING (is_supervisor_or_admin());

-- Políticas para benchmark_v3_results
CREATE POLICY "Admins can manage benchmark v3 results" 
ON benchmark_v3_results FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view benchmark v3 results" 
ON benchmark_v3_results FOR SELECT 
USING (is_supervisor_or_admin());

-- Políticas para quality_insights_v3
CREATE POLICY "Admins can manage quality insights v3" 
ON quality_insights_v3 FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Supervisors can view quality insights v3" 
ON quality_insights_v3 FOR SELECT 
USING (is_supervisor_or_admin());