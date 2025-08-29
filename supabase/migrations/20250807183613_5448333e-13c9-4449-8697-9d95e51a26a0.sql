-- Fase 1: Correções críticas de banco de dados

-- 1. Corrigir tipos de dados
ALTER TABLE qa_validation_runs 
ALTER COLUMN avg_response_time_ms TYPE NUMERIC USING avg_response_time_ms::NUMERIC;

-- 2. Padronizar tipos de ID para relacionamentos
-- Converter test_case_id para integer quando necessário
ALTER TABLE qa_validation_results 
ALTER COLUMN test_case_id TYPE INTEGER USING test_case_id::INTEGER;

-- 3. Melhorar RLS policies - permitir acesso a resultados detalhados
DROP POLICY IF EXISTS "Admins can manage QA validation results" ON qa_validation_results;
DROP POLICY IF EXISTS "Supervisors can view QA validation results" ON qa_validation_results;

-- Políticas mais permissivas para visualização de resultados
CREATE POLICY "Anyone can view QA validation results" 
ON qa_validation_results FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert QA validation results" 
ON qa_validation_results FOR INSERT 
WITH CHECK (true);

-- 4. Garantir que qa_validation_runs seja acessível
DROP POLICY IF EXISTS "Admins can manage QA validation runs" ON qa_validation_runs;
DROP POLICY IF EXISTS "Supervisors can view QA validation runs" ON qa_validation_runs;

CREATE POLICY "Anyone can view QA validation runs" 
ON qa_validation_runs FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage QA validation runs" 
ON qa_validation_runs FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_qa_validation_results_run_id 
ON qa_validation_results(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_qa_validation_results_test_case_id 
ON qa_validation_results(test_case_id);

CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_status 
ON qa_validation_runs(status);

CREATE INDEX IF NOT EXISTS idx_qa_validation_runs_model 
ON qa_validation_runs(model);

-- 6. Criar foreign key constraints corretas
ALTER TABLE qa_validation_results 
DROP CONSTRAINT IF EXISTS fk_qa_validation_results_test_case;

ALTER TABLE qa_validation_results 
ADD CONSTRAINT fk_qa_validation_results_test_case 
FOREIGN KEY (test_case_id) REFERENCES qa_test_cases(id) ON DELETE CASCADE;