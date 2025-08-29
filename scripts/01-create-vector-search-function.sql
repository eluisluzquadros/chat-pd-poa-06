-- PASSO 1: CRIAR FUNÇÃO DE VECTOR SEARCH QUE ESTÁ FALTANDO
-- Execute este SQL no Supabase Dashboard

-- Dropar função antiga se existir com assinatura diferente
DROP FUNCTION IF EXISTS match_document_sections(vector, float, int);
DROP FUNCTION IF EXISTS match_document_sections(vector(1536), float, int);

-- Criar função genérica que funciona com qualquer dimensão
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector,
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
    ds.id,
    ds.content,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding) AS similarity
  FROM document_sections ds
  WHERE ds.embedding IS NOT NULL
    AND array_length(ds.embedding::real[], 1) = array_length(query_embedding::real[], 1)
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar índice se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'document_sections' 
    AND indexname = 'document_sections_embedding_idx'
  ) THEN
    -- Criar índice para busca vetorial
    CREATE INDEX document_sections_embedding_idx 
    ON document_sections 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  END IF;
END $$;

-- Verificar situação atual
SELECT 
  'Total de documentos' as metrica,
  COUNT(*) as valor
FROM document_sections
UNION ALL
SELECT 
  'Documentos com embedding',
  COUNT(*)
FROM document_sections
WHERE embedding IS NOT NULL
UNION ALL
SELECT 
  'Documentos sem embedding',
  COUNT(*)
FROM document_sections
WHERE embedding IS NULL;

-- Verificar dimensões dos embeddings
SELECT 
  array_length(embedding, 1) as dimensao,
  COUNT(*) as quantidade
FROM document_sections
WHERE embedding IS NOT NULL
GROUP BY dimensao
ORDER BY quantidade DESC;