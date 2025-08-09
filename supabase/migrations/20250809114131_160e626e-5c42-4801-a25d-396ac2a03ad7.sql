-- Clean up orphaned validation runs that are stuck in 'running' status
UPDATE qa_validation_runs 
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Run abandoned - auto-cleaned'
WHERE 
  status = 'running' 
  AND started_at < NOW() - INTERVAL '10 minutes';

-- Add error_message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'qa_validation_runs' AND column_name = 'error_message') THEN
    ALTER TABLE qa_validation_runs ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Add last_heartbeat column for detecting dead runs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'qa_validation_runs' AND column_name = 'last_heartbeat') THEN
    ALTER TABLE qa_validation_runs ADD COLUMN last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;