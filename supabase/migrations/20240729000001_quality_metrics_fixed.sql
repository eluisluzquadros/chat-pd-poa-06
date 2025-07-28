-- Create quality metrics table for real-time monitoring
CREATE TABLE IF NOT EXISTS quality_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  response_time INTEGER NOT NULL,
  has_valid_response BOOLEAN DEFAULT false,
  has_beta_message BOOLEAN DEFAULT false,
  has_table BOOLEAN DEFAULT false,
  confidence DECIMAL(3, 2) DEFAULT 0.0,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quality_metrics_session_id ON quality_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_created_at ON quality_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_category ON quality_metrics(category);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_beta_message ON quality_metrics(has_beta_message);

-- Create view for daily statistics
CREATE OR REPLACE VIEW quality_metrics_daily AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN has_beta_message THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as beta_rate,
  SUM(CASE WHEN has_valid_response THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as valid_response_rate,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT session_id) as unique_sessions
FROM quality_metrics
GROUP BY DATE(created_at);

-- Create view for hourly statistics
CREATE OR REPLACE VIEW quality_metrics_hourly AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_queries,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN has_beta_message THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as beta_rate,
  AVG(confidence) as avg_confidence,
  category,
  COUNT(DISTINCT session_id) as unique_sessions
FROM quality_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), category;

-- Create alerts table
CREATE TABLE IF NOT EXISTS quality_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('warning', 'critical')),
  issues JSONB NOT NULL,
  metrics JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check quality thresholds
CREATE OR REPLACE FUNCTION check_quality_thresholds()
RETURNS TABLE (
  metric_name TEXT,
  current_value DECIMAL,
  threshold_value DECIMAL,
  status TEXT
) AS $$
DECLARE
  recent_stats RECORD;
BEGIN
  -- Get stats from last 20 queries
  SELECT 
    COUNT(*) as count,
    AVG(response_time) as avg_response_time,
    SUM(CASE WHEN has_beta_message THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as beta_rate,
    AVG(confidence) as avg_confidence,
    SUM(CASE WHEN has_valid_response THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as valid_rate
  INTO recent_stats
  FROM (
    SELECT * FROM quality_metrics 
    ORDER BY created_at DESC 
    LIMIT 20
  ) recent;

  -- Check response time
  RETURN QUERY
  SELECT 
    'Response Time'::TEXT,
    recent_stats.avg_response_time::DECIMAL,
    5000::DECIMAL,
    CASE WHEN recent_stats.avg_response_time > 5000 THEN 'FAIL' ELSE 'PASS' END::TEXT;

  -- Check beta rate
  RETURN QUERY
  SELECT 
    'Beta Message Rate'::TEXT,
    recent_stats.beta_rate::DECIMAL,
    0.05::DECIMAL,
    CASE WHEN recent_stats.beta_rate > 0.05 THEN 'FAIL' ELSE 'PASS' END::TEXT;

  -- Check confidence
  RETURN QUERY
  SELECT 
    'Average Confidence'::TEXT,
    recent_stats.avg_confidence::DECIMAL,
    0.7::DECIMAL,
    CASE WHEN recent_stats.avg_confidence < 0.7 THEN 'FAIL' ELSE 'PASS' END::TEXT;

  -- Check valid response rate
  RETURN QUERY
  SELECT 
    'Valid Response Rate'::TEXT,
    recent_stats.valid_rate::DECIMAL,
    0.8::DECIMAL,
    CASE WHEN recent_stats.valid_rate < 0.8 THEN 'FAIL' ELSE 'PASS' END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage quality metrics" ON quality_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage quality alerts" ON quality_alerts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to read their own metrics
CREATE POLICY "Users can read their own metrics" ON quality_metrics
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    session_id IN (
      SELECT session_id FROM chat_history 
      WHERE user_id = auth.uid()::TEXT
    )
  );