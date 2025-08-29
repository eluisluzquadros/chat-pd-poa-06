-- Add cleanup function for stuck QA runs
CREATE OR REPLACE FUNCTION cleanup_stuck_qa_runs()
RETURNS void AS $$
BEGIN
  -- Mark runs as failed if they've been running for more than 10 minutes
  UPDATE qa_validation_runs
  SET 
    status = 'failed',
    completed_at = NOW()
  WHERE 
    status = 'running'
    AND started_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup every 5 minutes
-- Note: This requires pg_cron extension to be enabled
-- Run this in the Supabase SQL editor:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-stuck-qa-runs', '*/5 * * * *', 'SELECT cleanup_stuck_qa_runs();');