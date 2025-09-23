-- Continuar copiando os dados restantes
UPDATE knowledgebase 
SET embedding = embedding_json
WHERE embedding_json IS NOT NULL 
  AND embedding IS NULL;

-- Remover a coluna antiga
ALTER TABLE knowledgebase 
DROP COLUMN embedding_json;

-- Criar índice vetorial para otimizar buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Testar a função match_knowledgebase
WITH test_embedding AS (
  SELECT embedding 
  FROM knowledgebase 
  WHERE embedding IS NOT NULL 
  LIMIT 1
)
SELECT COUNT(*) as function_test_results
FROM match_knowledgebase(
  (SELECT embedding FROM test_embedding),
  0.5,
  5,
  'PLANO_DIRETOR'
);

-- Verificar resultado final
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding) as com_embedding
FROM knowledgebase;