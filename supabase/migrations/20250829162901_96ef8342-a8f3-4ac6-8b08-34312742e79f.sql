-- Clean up the orphaned "running" validation run
UPDATE qa_validation_runs
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Sistema órfão - finalizado durante limpeza'
WHERE 
  status = 'running'
  AND id = '05d12c25-7108-48de-a0f9-f9f150a64644';