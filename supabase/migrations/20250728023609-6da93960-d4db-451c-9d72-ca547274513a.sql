-- Mark stuck validation runs as failed
UPDATE qa_validation_runs 
SET status = 'failed',
    error_message = 'Execution timeout - marked as failed during cleanup',
    completed_at = now()
WHERE status = 'running' 
  AND started_at < now() - interval '30 minutes';