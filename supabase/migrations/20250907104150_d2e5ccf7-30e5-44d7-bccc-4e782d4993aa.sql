-- Copiar dados em lotes muito pequenos (50 por vez) para evitar problemas de memória
-- Lote 2: próximos 50 registros
UPDATE knowledgebase 
SET embedding = embedding_json
WHERE embedding_json IS NOT NULL 
  AND embedding IS NULL
  AND id IN (
    SELECT id 
    FROM knowledgebase 
    WHERE embedding_json IS NOT NULL 
      AND embedding IS NULL
    LIMIT 50
  );

-- Verificar progresso
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo
FROM knowledgebase;