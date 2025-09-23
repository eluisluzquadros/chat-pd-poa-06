-- Fix the orphaned validation run with correct accuracy format (0.465 instead of 46.5)
UPDATE qa_validation_runs
SET 
  status = 'completed',
  completed_at = '2025-08-29T16:34:49.555Z'::timestamp with time zone,
  passed_tests = 1,
  total_tests = 10,
  overall_accuracy = 0.465,
  error_message = NULL
WHERE 
  id = '90364963-5edb-4e16-bc19-86761f8688b6'
  AND status = 'running';