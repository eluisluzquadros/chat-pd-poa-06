-- Enhanced Query Cache Migration
-- Adds TTL support, metadata storage, and improved indexing

-- Add new columns to existing query_cache table
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS ttl INTEGER DEFAULT 1800000, -- 30 minutes in milliseconds
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cache_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update expires_at based on timestamp and ttl
UPDATE query_cache 
SET expires_at = timestamp + (ttl || ' milliseconds')::INTERVAL
WHERE expires_at IS NULL;

-- Create enhanced indexes for better performance
DROP INDEX IF EXISTS idx_query_cache_timestamp;
DROP INDEX IF EXISTS idx_query_cache_hit_count;
DROP INDEX IF EXISTS idx_query_cache_category;
DROP INDEX IF EXISTS idx_query_cache_last_accessed;

-- Recreate indexes with better performance characteristics
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON query_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_query_cache_category_confidence ON query_cache(category, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_hit_count_desc ON query_cache(hit_count DESC, last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_last_accessed_desc ON query_cache(last_accessed DESC) WHERE last_accessed > NOW() - INTERVAL '1 hour';
CREATE INDEX IF NOT EXISTS idx_query_cache_key_hash ON query_cache USING HASH(key);

-- Add partial indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_query_cache_high_confidence ON query_cache(confidence, hit_count) WHERE confidence >= 0.8;
CREATE INDEX IF NOT EXISTS idx_query_cache_popular_recent ON query_cache(hit_count, last_accessed) WHERE hit_count > 5 AND last_accessed > NOW() - INTERVAL '24 hours';

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_query_cache_metadata_gin ON query_cache USING GIN(metadata);

-- Enhanced cache cleanup function with TTL support
CREATE OR REPLACE FUNCTION enhanced_clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired entries based on TTL
  DELETE FROM query_cache 
  WHERE expires_at < NOW()
     OR (expires_at IS NULL AND timestamp < NOW() - INTERVAL '24 hours')
     OR last_accessed < NOW() - INTERVAL '2 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO cache_cleanup_log (cleaned_at, deleted_count, cleanup_type)
  VALUES (NOW(), deleted_count, 'ttl_cleanup');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create cache cleanup log table
CREATE TABLE IF NOT EXISTS cache_cleanup_log (
  id BIGSERIAL PRIMARY KEY,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_count INTEGER DEFAULT 0,
  cleanup_type TEXT DEFAULT 'manual',
  notes TEXT
);

-- Enhanced cache statistics function
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  memory_worthy_entries BIGINT,
  avg_hit_count NUMERIC,
  avg_confidence NUMERIC,
  cache_size_mb NUMERIC,
  top_categories TEXT[],
  hit_rate_estimate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
    COUNT(*) FILTER (WHERE hit_count > 3 AND confidence >= 0.8) as memory_worthy_entries,
    AVG(hit_count) as avg_hit_count,
    AVG(confidence) as avg_confidence,
    ROUND((pg_total_relation_size('query_cache') / 1024.0 / 1024.0)::NUMERIC, 2) as cache_size_mb,
    ARRAY(
      SELECT category 
      FROM query_cache 
      GROUP BY category 
      ORDER BY COUNT(*) DESC 
      LIMIT 5
    ) as top_categories,
    CASE 
      WHEN SUM(hit_count) > 0 THEN 
        ROUND((SUM(hit_count)::NUMERIC / (SUM(hit_count) + COUNT(*))) * 100, 2)
      ELSE 0 
    END as hit_rate_estimate
  FROM query_cache;
END;
$$ LANGUAGE plpgsql;

-- Cache invalidation functions
CREATE OR REPLACE FUNCTION invalidate_cache_by_pattern(pattern_text TEXT)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM query_cache 
  WHERE query ILIKE '%' || pattern_text || '%'
     OR response ILIKE '%' || pattern_text || '%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO cache_cleanup_log (cleaned_at, deleted_count, cleanup_type, notes)
  VALUES (NOW(), deleted_count, 'pattern_invalidation', 'Pattern: ' || pattern_text);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION invalidate_cache_by_category(category_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM query_cache 
  WHERE category = category_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO cache_cleanup_log (cleaned_at, deleted_count, cleanup_type, notes)
  VALUES (NOW(), deleted_count, 'category_invalidation', 'Category: ' || category_name);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enhanced cache effectiveness view
DROP VIEW IF EXISTS cache_effectiveness;
CREATE VIEW cache_effectiveness AS
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  COUNT(DISTINCT category) as categories,
  SUM(CASE WHEN last_accessed > NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as active_last_hour,
  SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as high_confidence_entries,
  SUM(CASE WHEN hit_count > 5 THEN 1 ELSE 0 END) as popular_entries,
  ROUND(AVG(confidence), 3) as avg_confidence,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (SUM(hit_count)::DECIMAL / (SUM(hit_count) + COUNT(*))) * 100 
      ELSE 0 
    END, 2
  ) as estimated_hit_rate_percent,
  pg_size_pretty(pg_total_relation_size('query_cache')) as table_size
FROM query_cache;

-- Cache performance view by category
CREATE OR REPLACE VIEW cache_performance_by_category AS
SELECT 
  category,
  COUNT(*) as entry_count,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_count,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits,
  AVG(confidence) as avg_confidence,
  MIN(timestamp) as oldest_entry,
  MAX(last_accessed) as most_recent_access,
  SUM(CASE WHEN hit_count > 5 THEN 1 ELSE 0 END) as popular_entries_count
FROM query_cache
GROUP BY category
ORDER BY total_hits DESC;

-- Memory cache candidates view (entries that should be kept in memory)
CREATE OR REPLACE VIEW memory_cache_candidates AS
SELECT 
  key,
  query,
  category,
  confidence,
  hit_count,
  last_accessed,
  expires_at,
  (hit_count * 0.7 + EXTRACT(EPOCH FROM (NOW() - last_accessed)) / 3600 * 0.3) as cache_score
FROM query_cache
WHERE expires_at > NOW()
  AND (hit_count > 3 OR confidence >= 0.9)
  AND last_accessed > NOW() - INTERVAL '12 hours'
ORDER BY cache_score DESC
LIMIT 200;

-- Trigger to automatically set expires_at when inserting/updating
CREATE OR REPLACE FUNCTION set_cache_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NEW.timestamp + (NEW.ttl || ' milliseconds')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_cache_expiration ON query_cache;
CREATE TRIGGER trigger_set_cache_expiration
  BEFORE INSERT OR UPDATE ON query_cache
  FOR EACH ROW
  EXECUTE FUNCTION set_cache_expiration();

-- Update RLS policies for enhanced security
DROP POLICY IF EXISTS "Service role can manage query cache" ON query_cache;
DROP POLICY IF EXISTS "Authenticated users can read cache" ON query_cache;

-- Enhanced RLS policies
CREATE POLICY "Service role full access" ON query_cache
  FOR ALL 
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'supabase_admin'
  );

CREATE POLICY "Authenticated users read cache" ON query_cache
  FOR SELECT 
  USING (
    auth.jwt() ->> 'sub' IS NOT NULL AND
    expires_at > NOW()
  );

-- Allow authenticated users to update hit counts (for cache warming)
CREATE POLICY "Authenticated users update hit counts" ON query_cache
  FOR UPDATE 
  USING (
    auth.jwt() ->> 'sub' IS NOT NULL AND
    expires_at > NOW()
  )
  WITH CHECK (
    auth.jwt() ->> 'sub' IS NOT NULL AND
    expires_at > NOW()
  );

-- Create indexes on cleanup log
CREATE INDEX IF NOT EXISTS idx_cache_cleanup_log_cleaned_at ON cache_cleanup_log(cleaned_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_cleanup_log_type ON cache_cleanup_log(cleanup_type);

-- Final optimization: Update table statistics
ANALYZE query_cache;
ANALYZE cache_cleanup_log;

-- Create a scheduled cleanup job comment (needs manual setup in Supabase)
COMMENT ON FUNCTION enhanced_clean_expired_cache() IS 
'Run this function every 30 minutes: SELECT cron.schedule(''enhanced-cache-cleanup'', ''*/30 * * * *'', ''SELECT enhanced_clean_expired_cache();'');';

-- Performance monitoring query
COMMENT ON VIEW cache_effectiveness IS 
'Monitor cache performance with: SELECT * FROM cache_effectiveness;';

COMMENT ON VIEW cache_performance_by_category IS 
'Analyze cache performance by category: SELECT * FROM cache_performance_by_category;';

-- Sample usage comments
COMMENT ON FUNCTION invalidate_cache_by_pattern(TEXT) IS 
'Invalidate cache entries matching pattern: SELECT invalidate_cache_by_pattern(''bairro'');';

COMMENT ON FUNCTION invalidate_cache_by_category(TEXT) IS 
'Invalidate all entries in category: SELECT invalidate_cache_by_category(''construction'');';