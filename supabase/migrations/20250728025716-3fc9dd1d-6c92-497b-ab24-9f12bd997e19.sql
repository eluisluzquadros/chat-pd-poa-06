-- Clean up all currently stuck QA validation runs
UPDATE qa_validation_runs 
SET 
  status = 'failed',
  error_message = 'Manual cleanup: validation process was stuck and had to be reset',
  completed_at = NOW()
WHERE 
  status = 'running';