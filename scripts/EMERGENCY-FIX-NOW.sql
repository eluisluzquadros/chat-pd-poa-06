-- 🚨 SCRIPT SQL DE EMERGÊNCIA PARA CONSERTAR O RAG
-- Execute isso DIRETAMENTE no Supabase SQL Editor

-- 1. CRIAR FUNÇÃO DE MATCHING QUE ESTÁ FALTANDO
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    document_sections.id,
    document_sections.content,
    document_sections.metadata,
    1 - (document_sections.embedding <=> query_embedding) AS similarity
  FROM document_sections
  WHERE document_sections.embedding IS NOT NULL
    AND 1 - (document_sections.embedding <=> query_embedding) > match_threshold
  ORDER BY document_sections.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. VERIFICAR DIMENSÃO DOS EMBEDDINGS
SELECT 
  COUNT(*) as total,
  array_length(embedding, 1) as dimension
FROM document_sections
WHERE embedding IS NOT NULL
GROUP BY dimension
ORDER BY total DESC;

-- 3. SE EMBEDDINGS ESTÃO CORROMPIDOS (dimensão != 1536), LIMPAR
-- ATENÇÃO: Isso vai DELETAR os embeddings corrompidos!
-- UPDATE document_sections 
-- SET embedding = NULL 
-- WHERE array_length(embedding, 1) != 1536;

-- 4. VERIFICAR SE TEMOS ÍNDICE PARA VECTOR SEARCH
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_sections'
  AND indexdef LIKE '%embedding%';

-- 5. SE NÃO TEM ÍNDICE, CRIAR
-- CREATE INDEX document_sections_embedding_idx 
-- ON document_sections 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- 6. CONTAR DOCUMENTOS SEM EMBEDDING
SELECT 
  COUNT(*) as total_docs,
  COUNT(embedding) as with_embedding,
  COUNT(*) - COUNT(embedding) as without_embedding
FROM document_sections;