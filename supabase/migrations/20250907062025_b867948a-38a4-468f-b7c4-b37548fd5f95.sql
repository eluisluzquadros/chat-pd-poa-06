-- Primeiro verificar as dimensões existentes dos vetores
SELECT 
  vector_dims(embedding_json) as dimensoes,
  COUNT(*) as quantidade
FROM knowledgebase 
WHERE embedding_json IS NOT NULL
GROUP BY vector_dims(embedding_json)
ORDER BY quantidade DESC;

-- Renomear coluna embedding_json para embedding na tabela knowledgebase
ALTER TABLE knowledgebase 
RENAME COLUMN embedding_json TO embedding;

-- Criar índice vetorial para otimizar buscas (usando dimensão padrão)
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Testar a função match_knowledgebase com uma query de exemplo
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
) WHERE function_test_results.id IS NOT NULL;