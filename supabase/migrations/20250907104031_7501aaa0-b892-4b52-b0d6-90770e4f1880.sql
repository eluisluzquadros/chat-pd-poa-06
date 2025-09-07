-- Primeiro, criar a nova coluna embedding
ALTER TABLE knowledgebase 
ADD COLUMN embedding vector(1536);

-- Copiar dados em lotes pequenos para evitar problemas de memória
-- Primeiro lote: 200 registros
UPDATE knowledgebase 
SET embedding = embedding_json
WHERE embedding_json IS NOT NULL 
  AND embedding IS NULL
  AND id IN (
    SELECT id 
    FROM knowledgebase 
    WHERE embedding_json IS NOT NULL 
    LIMIT 200
  );

-- Verificar quantos foram processados
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo
FROM knowledgebase;