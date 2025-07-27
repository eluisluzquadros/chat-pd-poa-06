-- Create QA test cases table
CREATE TABLE public.qa_test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QA validation results table
CREATE TABLE public.qa_validation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id UUID NOT NULL REFERENCES public.qa_test_cases(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  actual_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  accuracy_score NUMERIC(3,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  response_time_ms INTEGER,
  error_type TEXT,
  error_details TEXT,
  session_id UUID,
  validation_run_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QA validation runs table for batch executions
CREATE TABLE public.qa_validation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  overall_accuracy NUMERIC(3,2),
  avg_response_time_ms INTEGER,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_validation_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for QA test cases
CREATE POLICY "Admins can manage QA test cases" 
ON public.qa_test_cases 
FOR ALL 
USING (is_admin());

CREATE POLICY "Supervisors can view QA test cases" 
ON public.qa_test_cases 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create policies for QA validation results
CREATE POLICY "Admins can manage QA validation results" 
ON public.qa_validation_results 
FOR ALL 
USING (is_admin());

CREATE POLICY "Supervisors can view QA validation results" 
ON public.qa_validation_results 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create policies for QA validation runs
CREATE POLICY "Admins can manage QA validation runs" 
ON public.qa_validation_runs 
FOR ALL 
USING (is_admin());

CREATE POLICY "Supervisors can view QA validation runs" 
ON public.qa_validation_runs 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create indexes for performance
CREATE INDEX idx_qa_test_cases_category ON public.qa_test_cases(category);
CREATE INDEX idx_qa_test_cases_difficulty ON public.qa_test_cases(difficulty);
CREATE INDEX idx_qa_test_cases_active ON public.qa_test_cases(is_active);
CREATE INDEX idx_qa_validation_results_test_case ON public.qa_validation_results(test_case_id);
CREATE INDEX idx_qa_validation_results_model ON public.qa_validation_results(model);
CREATE INDEX idx_qa_validation_results_run ON public.qa_validation_results(validation_run_id);
CREATE INDEX idx_qa_validation_runs_model ON public.qa_validation_runs(model);
CREATE INDEX idx_qa_validation_runs_status ON public.qa_validation_runs(status);

-- Create trigger for updated_at
CREATE TRIGGER update_qa_test_cases_updated_at
BEFORE UPDATE ON public.qa_test_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample QA test cases for SQL validation
INSERT INTO public.qa_test_cases (question, expected_answer, category, difficulty, tags) VALUES
('Quantos usuários estão ativos no sistema?', 'Consulta à tabela user_accounts com filtro is_active=true', 'users', 'easy', '{"sql", "count", "users"}'),
('Qual o total de tokens utilizados por modelo no último mês?', 'Agregação da tabela token_usage por modelo com filtro de data', 'analytics', 'medium', '{"sql", "aggregation", "tokens"}'),
('Quais são os 10 usuários com maior uso de tokens?', 'Query com JOIN entre token_usage e user_accounts, ORDER BY e LIMIT', 'analytics', 'hard', '{"sql", "join", "ranking"}'),
('Quantas sessões de chat foram criadas hoje?', 'Consulta à tabela chat_sessions com filtro de data', 'chat', 'easy', '{"sql", "count", "sessions"}'),
('Qual a taxa de feedback positivo por modelo?', 'Query complexa com JOIN e cálculos de porcentagem', 'feedback', 'hard', '{"sql", "join", "percentage"}');