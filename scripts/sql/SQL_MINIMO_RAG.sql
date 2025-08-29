-- SQL MÍNIMO ESSENCIAL - Sistema RAG
-- Execute este SQL no Supabase Dashboard: SQL Editor

-- 1. Adicionar coluna chunk_metadata se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_embeddings' 
    AND column_name = 'chunk_metadata'
  ) THEN
    ALTER TABLE document_embeddings 
    ADD COLUMN chunk_metadata jsonb;
  END IF;
END $$;

-- 2. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_chunk_metadata 
ON document_embeddings USING gin(chunk_metadata);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id 
ON document_embeddings(document_id);

-- 3. Função match_documents CORRIGIDA (versão simples)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_count integer,
  document_ids text[]
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

-- 4. Função match_hierarchical_documents CORRIGIDA
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids text[],
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
    LIMIT match_count * 2
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      bm.document_id,
      CASE
        -- Boost para certificação
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%')
        THEN bm.base_similarity * 1.8
        
        -- Boost para 4º distrito
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND lower(query_text) LIKE '%4º distrito%' 
        THEN bm.base_similarity * 1.8
        
        -- Boost para artigo específico
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND lower(query_text) LIKE '%art%' || (bm.chunk_metadata->>'articleNumber') || '%'
        THEN bm.base_similarity * 1.5
        
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

-- 5. Função para atualizar metadados dos chunks existentes
CREATE OR REPLACE FUNCTION update_chunk_metadata()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  chunk_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Atualizar chunks sem metadados
  FOR chunk_record IN 
    SELECT id, content_chunk 
    FROM document_embeddings 
    WHERE chunk_metadata IS NULL
    LIMIT 1000
  LOOP
    UPDATE document_embeddings
    SET chunk_metadata = jsonb_build_object(
      'hasCertification', 
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%certificação%' 
          AND (lower(chunk_record.content_chunk) LIKE '%sustentabilidade%' 
            OR lower(chunk_record.content_chunk) LIKE '%ambiental%')
        THEN true 
        ELSE false 
      END,
      'has4thDistrict',
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%4º distrito%' 
          OR lower(chunk_record.content_chunk) LIKE '%quarto distrito%'
          OR lower(chunk_record.content_chunk) LIKE '%zot 8.2%'
        THEN true 
        ELSE false 
      END,
      'articleNumber',
      (regexp_match(chunk_record.content_chunk, 'Art\.\s*(\d+)', 'i'))[1],
      'hasImportantKeywords',
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%certificação%' 
          OR lower(chunk_record.content_chunk) LIKE '%4º distrito%'
          OR lower(chunk_record.content_chunk) LIKE '%sustentabilidade%'
          OR lower(chunk_record.content_chunk) LIKE '%altura máxima%'
          OR lower(chunk_record.content_chunk) LIKE '%coeficiente%'
          OR lower(chunk_record.content_chunk) LIKE '%outorga onerosa%'
        THEN true 
        ELSE false 
      END
    )
    WHERE id = chunk_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Atualizados % chunks com metadados', updated_count;
END;
$$;

-- 6. Criar tabela de cache se não existir
CREATE TABLE IF NOT EXISTS query_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  embedding vector(1536),
  results jsonb,
  created_at timestamp with time zone DEFAULT now(),
  hit_count integer DEFAULT 0,
  last_accessed timestamp with time zone DEFAULT now()
);

-- Criar índice único na query se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'query_cache_query_key'
  ) THEN
    CREATE UNIQUE INDEX query_cache_query_key ON query_cache(query);
  END IF;
END $$;

-- 7. Executar atualização de metadados
SELECT update_chunk_metadata();

-- 8. Verificação final
DO $$
DECLARE
  chunk_count INTEGER;
  metadata_count INTEGER;
  func_count INTEGER;
BEGIN
  -- Contar chunks
  SELECT COUNT(*) INTO chunk_count FROM document_embeddings;
  
  -- Contar chunks com metadados
  SELECT COUNT(*) INTO metadata_count 
  FROM document_embeddings 
  WHERE chunk_metadata IS NOT NULL;
  
  -- Contar funções criadas
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname IN ('match_documents', 'match_hierarchical_documents', 'update_chunk_metadata');
  
  RAISE NOTICE '✅ SQL executado com sucesso!';
  RAISE NOTICE '📊 Total de chunks: %', chunk_count;
  RAISE NOTICE '📊 Chunks com metadados: %', metadata_count;
  RAISE NOTICE '📊 Funções criadas: %', func_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '1. Deploy das Edge Functions via Dashboard';
  RAISE NOTICE '2. Execute: npx tsx scripts/reprocess-knowledge-base.ts';
  RAISE NOTICE '3. Teste as queries específicas no chat';
END $$;