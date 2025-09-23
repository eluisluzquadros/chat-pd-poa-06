-- Migração em lotes muito pequenos para evitar problema de memória
-- Primeira verificação
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo
FROM knowledgebase;

-- Migrar apenas 10 registros por vez
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

-- Verificar progresso
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo,
  COUNT(*) - COUNT(embedding) as restantes_para_migrar
FROM knowledgebase;