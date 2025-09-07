-- Criar nova coluna embedding com dimensões especificadas
ALTER TABLE knowledgebase 
ADD COLUMN embedding vector(1536);

-- Copiar dados da coluna embedding_json para embedding
UPDATE knowledgebase 
SET embedding = embedding_json
WHERE embedding_json IS NOT NULL;

-- Remover a coluna antiga
ALTER TABLE knowledgebase 
DROP COLUMN embedding_json;

-- Criar índice vetorial para otimizar buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verificar que tudo funcionou
SELECT COUNT(*) as registros_com_embedding
FROM knowledgebase 
WHERE embedding IS NOT NULL;