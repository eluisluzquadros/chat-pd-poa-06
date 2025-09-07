-- Create a simple hash index instead of ivfflat to avoid memory issues
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_hash_idx 
ON knowledgebase 
USING hash ((embedding::text));

-- Alternative: try smaller ivfflat with fewer lists
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_simple_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Check current indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'knowledgebase';