-- Corrigir a função RPC match_legal_articles para incluir TODOS os document_types
-- Esta função estava filtrando apenas LUOS e PDUS, ignorando REGIME_FALLBACK e QA_CATEGORY

CREATE OR REPLACE FUNCTION match_legal_articles(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  document_type text,
  article_number int,
  article_text text,
  full_content text,
  keywords text[],
  source text,
  title text,
  hierarchy_info jsonb,
  embedding vector(1536),
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.document_type,
    la.article_number,
    la.article_text,
    la.full_content,
    la.keywords,
    la.source,
    la.title,
    la.hierarchy_info,
    la.embedding,
    1 - (la.embedding <=> query_embedding) as similarity
  FROM legal_articles la
  WHERE 
    la.embedding IS NOT NULL
    -- REMOVIDO: Filtro que excluía REGIME_FALLBACK e QA_CATEGORY
    -- AND la.document_type IN ('LUOS', 'PDUS')
    -- AGORA: Inclui TODOS os document_types
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Garantir que os índices estão otimizados para busca vetorial
CREATE INDEX IF NOT EXISTS idx_legal_articles_embedding 
ON legal_articles 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Verificar quantos registros de cada tipo têm embeddings
SELECT 
  document_type,
  COUNT(*) as total,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
FROM legal_articles
GROUP BY document_type
ORDER BY document_type;