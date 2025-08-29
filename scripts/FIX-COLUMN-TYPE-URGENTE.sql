-- 🚨 PROBLEMA IDENTIFICADO: Coluna embedding está como TEXT ao invés de VECTOR
-- Execute este SQL no Supabase Dashboard AGORA!

-- 1. Verificar tipo atual da coluna
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
  AND column_name = 'embedding';

-- 2. Verificar se pgvector está instalado
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. Se pgvector não estiver instalado, instalar
CREATE EXTENSION IF NOT EXISTS vector;

-- 4. LIMPAR todos embeddings corrompidos (são strings, não arrays)
UPDATE document_sections SET embedding = NULL;

-- 5. Alterar tipo da coluna para vector
ALTER TABLE document_sections 
DROP COLUMN IF EXISTS embedding;

ALTER TABLE document_sections 
ADD COLUMN embedding vector(1536);

-- 6. Criar índice para busca vetorial
CREATE INDEX IF NOT EXISTS document_sections_embedding_idx 
ON document_sections 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 7. Verificar se ficou correto
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
  AND column_name = 'embedding';

-- Deve mostrar:
-- column_name | data_type | udt_name
-- embedding   | USER-DEFINED | vector