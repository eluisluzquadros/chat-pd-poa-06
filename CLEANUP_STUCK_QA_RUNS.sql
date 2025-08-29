-- Limpar execuções de QA travadas em status 'running'
-- Marca como 'failed' todas as execuções que estão rodando há mais de 5 minutos

UPDATE qa_validation_runs
SET 
  status = 'failed',
  completed_at = NOW(),
  overall_accuracy = 0
WHERE 
  status = 'running'
  AND started_at < NOW() - INTERVAL '5 minutes';

-- Verificar quantas execuções foram atualizadas
SELECT 
  id,
  model,
  status,
  started_at,
  completed_at,
  total_tests,
  passed_tests
FROM qa_validation_runs
ORDER BY started_at DESC
LIMIT 10;