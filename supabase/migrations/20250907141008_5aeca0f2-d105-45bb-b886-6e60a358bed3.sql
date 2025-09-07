-- Continuar migração em pequenos lotes + criar índice vetorial
-- Migrar mais 10 registros
UPDATE knowledgebase 
SET embedding = embedding_json
WHERE embedding_json IS NOT NULL 
  AND embedding IS NULL
  AND id IN (
    SELECT id 
    FROM knowledgebase 
    WHERE embedding_json IS NOT NULL 
      AND embedding IS NULL
    LIMIT 10
  );

-- Criar índice vetorial essencial para otimizar buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verificar status
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding) as com_embedding_migrado,
  COUNT(*) - COUNT(embedding) as restantes
FROM knowledgebase;