-- Add reasoning column to qa_validation_results table to store LLM evaluation details
ALTER TABLE public.qa_validation_results 
ADD COLUMN evaluation_reasoning TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN public.qa_validation_results.evaluation_reasoning 
IS 'Detailed reasoning from LLM evaluation explaining the accuracy score';