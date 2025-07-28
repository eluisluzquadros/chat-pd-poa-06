-- Clean up stuck QA validation runs
UPDATE qa_validation_runs 
SET 
  status = 'failed',
  error_message = 'Auto-cleanup: validation timeout during system maintenance',
  completed_at = NOW()
WHERE 
  status = 'running' 
  AND started_at < NOW() - INTERVAL '30 minutes';