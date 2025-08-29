-- =====================================================
-- MIGRAÇÕES CONSOLIDADAS - CHAT PD POA
-- Execute este arquivo no SQL Editor do Supabase Cloud
-- =====================================================

-- 1. QUALITY METRICS
-- =====================================================
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

-- 2. QUERY CACHE
-- =====================================================
-- Create query cache table
CREATE TABLE IF NOT EXISTS query_cache (
  key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.0,
  category TEXT DEFAULT 'general',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_cache_timestamp ON query_cache(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_hit_count ON query_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_category ON query_cache(category);
CREATE INDEX IF NOT EXISTS idx_query_cache_last_accessed ON query_cache(last_accessed DESC);

-- Popular queries view
CREATE OR REPLACE VIEW popular_queries AS
SELECT 
  query,
  response,
  hit_count,
  confidence,
  category,
  timestamp,
  last_accessed
FROM query_cache
WHERE hit_count > 5
ORDER BY hit_count DESC
LIMIT 100;

-- Cache effectiveness view
CREATE OR REPLACE VIEW cache_effectiveness AS
SELECT 
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  COUNT(DISTINCT category) as categories,
  SUM(CASE WHEN last_accessed > NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as active_last_hour,
  SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as high_confidence_entries
FROM query_cache;

-- 3. MESSAGE FEEDBACK
-- =====================================================
-- Create message feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  model TEXT,
  helpful BOOLEAN NOT NULL,
  comment TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_feedback_session_id ON message_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_helpful ON message_feedback(helpful);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON message_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id ON message_feedback(user_id);

-- Create view for feedback statistics
CREATE OR REPLACE VIEW feedback_statistics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END) as negative_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as satisfaction_rate,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as comments_count
FROM message_feedback
GROUP BY DATE(created_at);

-- Create view for model performance
CREATE OR REPLACE VIEW model_feedback_stats AS
SELECT 
  model,
  COUNT(*) as total_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as satisfaction_rate,
  COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as comments_count
FROM message_feedback
WHERE model IS NOT NULL
GROUP BY model;

-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- =====================================================
-- Quality Metrics
CREATE POLICY "Service role can manage quality metrics" ON quality_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage quality alerts" ON quality_alerts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Query Cache
CREATE POLICY "Service role can manage query cache" ON query_cache
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read cache" ON query_cache
  FOR SELECT USING (auth.jwt()->>'sub' IS NOT NULL);

-- Message Feedback
CREATE POLICY "Users can insert feedback" ON message_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own feedback" ON message_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can read all feedback" ON message_feedback
  FOR SELECT USING (auth.jwt()->>'role' = 'service_role');

-- 6. FUNCTIONS
-- =====================================================
-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM query_cache 
  WHERE timestamp < NOW() - INTERVAL '24 hours'
  OR last_accessed < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

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

-- Function to get feedback summary for a session
CREATE OR REPLACE FUNCTION get_session_feedback_summary(p_session_id TEXT)
RETURNS TABLE (
  total_messages INTEGER,
  messages_with_feedback INTEGER,
  positive_feedback INTEGER,
  negative_feedback INTEGER,
  satisfaction_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT message_id)::INTEGER as total_messages,
    COUNT(*)::INTEGER as messages_with_feedback,
    SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::INTEGER as positive_feedback,
    SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END)::INTEGER as negative_feedback,
    CASE 
      WHEN COUNT(*) > 0 
      THEN SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)
      ELSE 0
    END as satisfaction_rate
  FROM message_feedback
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality metrics when negative feedback is received
CREATE OR REPLACE FUNCTION handle_negative_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.helpful = false THEN
    -- Insert quality alert
    INSERT INTO quality_alerts (
      level,
      issues,
      metrics,
      created_at
    ) VALUES (
      'warning',
      ARRAY['Negative user feedback received'],
      jsonb_build_object(
        'message_id', NEW.message_id,
        'session_id', NEW.session_id,
        'comment', NEW.comment,
        'model', NEW.model
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER negative_feedback_alert
  AFTER INSERT ON message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION handle_negative_feedback();

-- =====================================================
-- FIM DAS MIGRAÇÕES
-- =====================================================