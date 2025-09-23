-- Fix embedding column to proper vector type
ALTER TABLE knowledgebase 
ALTER COLUMN embedding TYPE vector(1536);

-- Now create the vector index
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify the fix
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'knowledgebase' 
  AND column_name = 'embedding';