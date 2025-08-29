-- Fase 1: Correções críticas de banco de dados (corrigida)

-- 1. Corrigir tipos de dados - avg_response_time_ms para NUMERIC
ALTER TABLE qa_validation_runs 
ALTER COLUMN avg_response_time_ms TYPE NUMERIC USING avg_response_time_ms::NUMERIC;

-- 2. Melhorar RLS policies para acessibilidade
DROP POLICY IF EXISTS "Admins can manage QA validation results" ON qa_validation_results;
DROP POLICY IF EXISTS "Supervisors can view QA validation results" ON qa_validation_results;

CREATE POLICY "Anyone can view QA validation results" 
ON qa_validation_results FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert QA validation results" 
ON qa_validation_results FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update QA validation results" 
ON qa_validation_results FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 3. Políticas para qa_validation_runs
DROP POLICY IF EXISTS "Admins can manage QA validation runs" ON qa_validation_runs;
DROP POLICY IF EXISTS "Supervisors can view QA validation runs" ON qa_validation_runs;

CREATE POLICY "Anyone can view QA validation runs" 
ON qa_validation_runs FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage QA validation runs" 
ON qa_validation_runs FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_qa_validation_results_run_id 
ON qa_validation_results(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_qa_validation_results_test_case_id 
ON qa_validation_results(test_case_id);

CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_status 
ON qa_validation_runs(status);

CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_model 
ON qa_validation_runs(model);

CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_completed 
ON qa_validation_runs(completed_at) WHERE completed_at IS NOT NULL;