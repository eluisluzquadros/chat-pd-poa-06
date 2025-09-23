-- Renomear coluna embedding_json para embedding na tabela knowledgebase
ALTER TABLE knowledgebase 
RENAME COLUMN embedding_json TO embedding;

-- Criar índice vetorial para otimizar buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verificar se a função match_knowledgebase funciona corretamente
SELECT COUNT(*) as total_with_embeddings
FROM knowledgebase 
WHERE embedding IS NOT NULL;

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
);