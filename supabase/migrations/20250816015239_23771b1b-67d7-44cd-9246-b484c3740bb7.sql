-- Create manual QA results table for temporary manual testing
CREATE TABLE public.manual_qa_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  actual_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  notes TEXT,
  tested_by UUID REFERENCES auth.users(id),
  tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_info JSONB DEFAULT '{}'::jsonb,
  category TEXT NOT NULL,
  response_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.manual_qa_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage manual QA results" 
ON public.manual_qa_results 
FOR ALL 
USING (is_admin());

CREATE POLICY "Supervisors can view manual QA results" 
ON public.manual_qa_results 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create index for performance
CREATE INDEX idx_manual_qa_results_test_case_id ON public.manual_qa_results(test_case_id);
CREATE INDEX idx_manual_qa_results_tested_at ON public.manual_qa_results(tested_at);
CREATE INDEX idx_manual_qa_results_category ON public.manual_qa_results(category);