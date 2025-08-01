-- SQL FINAL CORRIGIDO - Sistema RAG
-- Execute este SQL no Supabase Dashboard: SQL Editor

-- 1. Remover funções antigas/duplicadas
DROP FUNCTION IF EXISTS match_documents(vector, integer, bigint[]);
DROP FUNCTION IF EXISTS match_documents(vector, integer, uuid[]);
DROP FUNCTION IF EXISTS match_documents(vector, integer, text[]);
DROP FUNCTION IF EXISTS match_hierarchical_documents(vector, integer, bigint[], text);
DROP FUNCTION IF EXISTS match_hierarchical_documents(vector, integer, uuid[], text);
DROP FUNCTION IF EXISTS match_hierarchical_documents(vector, integer, text[], text);

-- 2. Criar função match_documents simplificada
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_count integer
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  document_id bigint,
  chunk_metadata jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.document_id,
    de.chunk_metadata
  FROM document_embeddings de
  WHERE de.embedding IS NOT NULL
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 3. Criar função match_hierarchical_documents com boost otimizado
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision,
  document_id bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base_matches AS (
    SELECT
      de.content_chunk,
      1 - (de.embedding <=> query_embedding) as base_similarity,
      de.chunk_metadata,
      de.document_id
    FROM document_embeddings de
    WHERE de.embedding IS NOT NULL
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      bm.document_id,
      CASE
        -- Super boost para certificação quando a query menciona
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%'
            OR lower(query_text) LIKE '%ambiental%')
        THEN bm.base_similarity * 2.5
        
        -- Super boost para 4º distrito quando a query menciona
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND (lower(query_text) LIKE '%4º distrito%' 
            OR lower(query_text) LIKE '%quarto distrito%')
        THEN bm.base_similarity * 2.5
        
        -- Boost para artigo específico
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND lower(query_text) LIKE '%art%' || (bm.chunk_metadata->>'articleNumber') || '%'
        THEN bm.base_similarity * 1.8
        
        -- Boost para keywords importantes
        WHEN bm.chunk_metadata->>'hasImportantKeywords' = 'true'
        THEN bm.base_similarity * 1.3
        
        ELSE bm.base_similarity
      END as boosted_score
    FROM base_matches bm
  )
  SELECT
    sm.content_chunk,
    sm.base_similarity as similarity,
    sm.chunk_metadata,
    LEAST(sm.boosted_score, 1.0) as boosted_score,
    sm.document_id
  FROM scored_matches sm
  ORDER BY sm.boosted_score DESC
  LIMIT match_count;
END;
$$;

-- 4. Verificação final do sistema
DO $$
DECLARE
  cert_count INTEGER;
  district_count INTEGER;
  total_with_metadata INTEGER;
  chunk_example RECORD;
BEGIN
  -- Contar chunks com certificação
  SELECT COUNT(*) INTO cert_count
  FROM document_embeddings
  WHERE chunk_metadata->>'hasCertification' = 'true';
  
  -- Contar chunks do 4º distrito
  SELECT COUNT(*) INTO district_count
  FROM document_embeddings
  WHERE chunk_metadata->>'has4thDistrict' = 'true';
  
  -- Total com metadados
  SELECT COUNT(*) INTO total_with_metadata
  FROM document_embeddings
  WHERE chunk_metadata IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema RAG configurado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status dos chunks:';
  RAISE NOTICE '   Total com metadados: %', total_with_metadata;
  RAISE NOTICE '   Chunks com certificação: %', cert_count;
  RAISE NOTICE '   Chunks do 4º distrito: %', district_count;
  RAISE NOTICE '';
  
  -- Mostrar exemplo de chunk com certificação
  IF cert_count > 0 THEN
    SELECT content_chunk, chunk_metadata INTO chunk_example
    FROM document_embeddings
    WHERE chunk_metadata->>'hasCertification' = 'true'
    LIMIT 1;
    
    RAISE NOTICE '📄 Exemplo de chunk com certificação:';
    RAISE NOTICE '   Artigo: %', chunk_example.chunk_metadata->>'articleNumber';
    RAISE NOTICE '   Preview: %...', LEFT(chunk_example.content_chunk, 80);
  END IF;
  
  -- Mostrar exemplo de chunk do 4º distrito
  IF district_count > 0 THEN
    SELECT content_chunk, chunk_metadata INTO chunk_example
    FROM document_embeddings
    WHERE chunk_metadata->>'has4thDistrict' = 'true'
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '📄 Exemplo de chunk do 4º distrito:';
    RAISE NOTICE '   Artigo: %', chunk_example.chunk_metadata->>'articleNumber';
    RAISE NOTICE '   Preview: %...', LEFT(chunk_example.content_chunk, 80);
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '1. Deploy das Edge Functions via Dashboard';
  RAISE NOTICE '2. Teste as queries no chat';
  RAISE NOTICE '';
END $$;