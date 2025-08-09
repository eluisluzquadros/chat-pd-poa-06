-- Clean up orphaned validation runs
UPDATE qa_validation_runs 
SET 
  status = 'failed',
  error_message = 'System cleanup - orphaned run detected',
  completed_at = NOW()
WHERE status = 'running' 
  AND created_at < NOW() - INTERVAL '10 minutes';