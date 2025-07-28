-- Update old validation runs that are stuck in running state
UPDATE qa_validation_runs 
SET status = 'failed', 
    error_message = 'Edge function dependencies were fixed - retry validation',
    completed_at = now()
WHERE status = 'running' 
  AND started_at < now() - interval '10 minutes';