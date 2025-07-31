-- Adiciona suporte para chunking hierárquico e metadados enriquecidos

-- Adiciona coluna para metadados de chunk se não existir
ALTER TABLE document_embeddings 
ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT NULL;

-- Cria índices para busca otimizada
CREATE INDEX IF NOT EXISTS idx_chunk_metadata_type 
ON document_embeddings((chunk_metadata->>'type'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_article 
ON document_embeddings((chunk_metadata->>'articleNumber'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_keywords 
ON document_embeddings USING gin((chunk_metadata->'keywords'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_certification 
ON document_embeddings((chunk_metadata->>'hasCertification'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_4th_district 
ON document_embeddings((chunk_metadata->>'has4thDistrict'));

-- Função para busca hierárquica otimizada
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids uuid[],
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base_matches AS (
    SELECT
      de.content_chunk,
      1 - (de.embedding <=> query_embedding) as base_similarity,
      de.chunk_metadata
    FROM document_embeddings de
    WHERE de.document_id = ANY(document_ids)
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 2 -- Get more candidates for re-ranking
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      CASE
        -- Boost máximo para 4º distrito + Art. 74
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND bm.chunk_metadata->>'articleNumber' = '74' 
          AND lower(query_text) LIKE '%4º distrito%' 
        THEN bm.base_similarity * 2.0
        
        -- Boost para certificação sustentável
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%')
        THEN bm.base_similarity * 1.8
        
        -- Boost para match exato de artigo
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND (lower(query_text) LIKE '%art. ' || (bm.chunk_metadata->>'articleNumber') || '%'
            OR lower(query_text) LIKE '%artigo ' || (bm.chunk_metadata->>'articleNumber') || '%')
        THEN bm.base_similarity * 1.5
        
        -- Boost para incisos específicos
        WHEN bm.chunk_metadata->>'incisoNumber' IS NOT NULL
          AND lower(query_text) LIKE '%' || lower(bm.chunk_metadata->>'incisoNumber') || '%'
        THEN bm.base_similarity * 1.3
        
        -- Boost para keywords importantes
        WHEN bm.chunk_metadata->>'hasImportantKeywords' = 'true'
        THEN bm.base_similarity * 1.2
        
        -- Penalização para chunks genéricos
        WHEN bm.chunk_metadata->>'hasImportantKeywords' = 'false'
          AND bm.chunk_metadata->>'type' = 'article'
          AND jsonb_array_length(COALESCE(bm.chunk_metadata->'keywords', '[]'::jsonb)) < 3
        THEN bm.base_similarity * 0.7
        
        ELSE bm.base_similarity
      END as boosted_score
    FROM base_matches bm
  )
  SELECT
    sm.content_chunk,
    sm.base_similarity as similarity,
    sm.chunk_metadata,
    LEAST(sm.boosted_score, 1.0) as boosted_score -- Cap at 1.0
  FROM scored_matches sm
  ORDER BY sm.boosted_score DESC
  LIMIT match_count;
END;
$$;

-- Função para estatísticas de chunks hierárquicos
CREATE OR REPLACE FUNCTION get_hierarchical_chunk_stats(document_id uuid)
RETURNS TABLE(
  total_chunks integer,
  article_chunks integer,
  inciso_chunks integer,
  paragraph_chunks integer,
  chunks_with_certification integer,
  chunks_with_4th_district integer,
  chunks_with_keywords integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_chunks,
    COUNT(*) FILTER (WHERE chunk_metadata->>'type' = 'article')::integer as article_chunks,
    COUNT(*) FILTER (WHERE chunk_metadata->>'type' = 'inciso')::integer as inciso_chunks,
    COUNT(*) FILTER (WHERE chunk_metadata->>'type' = 'paragraph')::integer as paragraph_chunks,
    COUNT(*) FILTER (WHERE chunk_metadata->>'hasCertification' = 'true')::integer as chunks_with_certification,
    COUNT(*) FILTER (WHERE chunk_metadata->>'has4thDistrict' = 'true')::integer as chunks_with_4th_district,
    COUNT(*) FILTER (WHERE chunk_metadata->>'hasImportantKeywords' = 'true')::integer as chunks_with_keywords
  FROM document_embeddings
  WHERE document_embeddings.document_id = $1;
END;
$$;

-- Comentários explicativos
COMMENT ON COLUMN document_embeddings.chunk_metadata IS 'Metadados hierárquicos do chunk incluindo tipo (article/inciso/paragraph), números, keywords e flags especiais';
COMMENT ON FUNCTION match_hierarchical_documents IS 'Busca vetorial com scoring contextual baseado em metadados hierárquicos e query';
COMMENT ON FUNCTION get_hierarchical_chunk_stats IS 'Retorna estatísticas sobre os chunks hierárquicos de um documento';