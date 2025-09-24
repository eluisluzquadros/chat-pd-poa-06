-- Fix query_cache table structure
-- Add missing columns for improved cache system

-- Add confidence column if it doesn't exist
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.85;

-- Add query_embedding column for semantic cache
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS query_embedding vector(1536);

-- Add metadata column for cache management
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add updated_at column for cache freshness
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for semantic search on cache
CREATE INDEX IF NOT EXISTS idx_cache_query_embedding 
ON query_cache 
USING ivfflat (query_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for faster exact query matching
CREATE INDEX IF NOT EXISTS idx_cache_query_lower 
ON query_cache (LOWER(query));

-- Create index for metadata filtering
CREATE INDEX IF NOT EXISTS idx_cache_metadata 
ON query_cache USING gin(metadata jsonb_path_ops);

-- Create function for semantic cache lookup
CREATE OR REPLACE FUNCTION find_cached_response(
  query_text TEXT,
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.95
)
RETURNS TABLE (
  id UUID,
  query TEXT,
  response TEXT,
  confidence float,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    query,
    response,
    COALESCE(confidence, 0.85) as confidence,
    CASE 
      WHEN query_embedding IS NULL THEN 0
      ELSE 1 - (query_embedding <=> $2)
    END as similarity
  FROM query_cache
  WHERE 
    -- Exact match (fast)
    (LOWER(TRIM(query)) = LOWER(TRIM($1)))
    OR
    -- Semantic match (if embedding exists)
    (query_embedding IS NOT NULL AND 1 - (query_embedding <=> $2) > similarity_threshold)
  ORDER BY 
    CASE 
      WHEN LOWER(TRIM(query)) = LOWER(TRIM($1)) THEN 1
      WHEN query_embedding IS NULL THEN 0
      ELSE 1 - (query_embedding <=> $2)
    END DESC
  LIMIT 1;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_query_cache_updated_at ON query_cache;
CREATE TRIGGER update_query_cache_updated_at 
  BEFORE UPDATE ON query_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_cache_updated_at();

-- Verify structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'query_cache'
ORDER BY ordinal_position;