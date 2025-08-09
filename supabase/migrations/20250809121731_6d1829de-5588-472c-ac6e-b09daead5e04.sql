-- Clean up orphaned validation runs using existing columns
UPDATE qa_validation_runs 
SET 
  status = 'failed',
  completed_at = NOW()
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '10 minutes';