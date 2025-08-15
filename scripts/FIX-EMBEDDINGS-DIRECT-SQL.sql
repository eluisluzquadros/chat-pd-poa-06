-- CORREÇÃO DEFINITIVA: Converter strings JSON para vetores
-- Execute este SQL no Supabase Dashboard

-- 1. Criar tabela temporária com embeddings corretos
CREATE TEMP TABLE temp_embeddings AS
SELECT 
  id,
  content,
  metadata,
  -- Converter string JSON para array e depois para vector
  CASE 
    WHEN embedding IS NOT NULL AND LENGTH(embedding::text) > 1000 THEN
      (embedding::text)::vector
    ELSE NULL
  END as embedding_vector
FROM document_sections;

-- 2. Verificar amostra
SELECT 
  id,
  pg_typeof(embedding_vector) as tipo,
  array_length(embedding_vector::real[], 1) as dimensoes
FROM temp_embeddings 
LIMIT 5;

-- 3. Limpar a tabela original
UPDATE document_sections SET embedding = NULL;

-- 4. Atualizar com vetores corretos
UPDATE document_sections ds
SET embedding = te.embedding_vector
FROM temp_embeddings te
WHERE ds.id = te.id
  AND te.embedding_vector IS NOT NULL;

-- 5. Verificar resultado
SELECT 
  COUNT(*) as total,
  COUNT(embedding) as com_embedding,
  pg_typeof(embedding) as tipo_embedding
FROM document_sections
GROUP BY pg_typeof(embedding);

-- 6. Testar busca vetorial
WITH test_query AS (
  SELECT embedding 
  FROM document_sections 
  WHERE embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  ds.id,
  substring(ds.content, 1, 100) as content_preview,
  1 - (ds.embedding <=> tq.embedding) as similarity
FROM document_sections ds, test_query tq
WHERE ds.embedding IS NOT NULL
ORDER BY ds.embedding <=> tq.embedding
LIMIT 5;