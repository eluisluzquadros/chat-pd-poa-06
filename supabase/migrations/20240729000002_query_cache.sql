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
CREATE INDEX idx_query_cache_timestamp ON query_cache(timestamp DESC);
CREATE INDEX idx_query_cache_hit_count ON query_cache(hit_count DESC);
CREATE INDEX idx_query_cache_category ON query_cache(category);
CREATE INDEX idx_query_cache_last_accessed ON query_cache(last_accessed DESC);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM query_cache 
  WHERE timestamp < NOW() - INTERVAL '24 hours'
  OR last_accessed < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean cache (requires pg_cron extension)
-- Note: This needs to be set up manually in Supabase dashboard
-- SELECT cron.schedule('clean-query-cache', '0 * * * *', 'SELECT clean_expired_cache()');

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

-- RLS policies
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;

-- Service role can manage cache
CREATE POLICY "Service role can manage query cache" ON query_cache
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Authenticated users can read cache (for analytics)
CREATE POLICY "Authenticated users can read cache" ON query_cache
  FOR SELECT USING (auth.jwt()->>'sub' IS NOT NULL);