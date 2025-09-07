-- Criar índice vetorial essencial para buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verificar se o índice foi criado
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'knowledgebase' AND indexname = 'knowledgebase_embedding_idx';