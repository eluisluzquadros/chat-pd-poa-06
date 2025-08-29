-- Cleanup orphaned validation runs that have no saved results
UPDATE qa_validation_runs 
SET status = 'failed', 
    error_message = 'CLEANUP: Run had no saved results - data persistence issue',
    completed_at = COALESCE(completed_at, now())
WHERE total_tests > 0 
  AND id IN (
    SELECT r.id 
    FROM qa_validation_runs r 
    LEFT JOIN qa_validation_results res ON res.validation_run_id = r.id
    WHERE r.total_tests > 0
    GROUP BY r.id, r.total_tests
    HAVING COUNT(res.id) = 0
  );

-- Update stuck running runs to failed status  
UPDATE qa_validation_runs 
SET status = 'failed',
    error_message = 'CLEANUP: Run was stuck in running status',
    completed_at = now()
WHERE status = 'running' 
  AND started_at < now() - interval '1 hour';

-- Clean up any orphaned validation results without corresponding runs
DELETE FROM qa_validation_results 
WHERE validation_run_id NOT IN (SELECT id FROM qa_validation_runs);