-- ============================================
-- SCRIPT CORRIGIDO PARA CRIAR/ATUALIZAR TABELA DOCUMENT_SECTIONS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Dropar funções existentes que podem conflitar
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_documents(vector(1536), float, int);
DROP FUNCTION IF EXISTS hybrid_search(text, vector, float, int);
DROP FUNCTION IF EXISTS hybrid_search(text, vector(1536), float, int);

-- 2. Habilitar extensão vector (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Criar tabela document_sections (se não existir)
CREATE TABLE IF NOT EXISTS public.document_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
  ON document_sections USING gin(to_tsvector('portuguese', content));

CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
  ON document_sections USING gin(metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_document_sections_source 
  ON document_sections((metadata->>'source_file'));

CREATE INDEX IF NOT EXISTS idx_document_sections_type 
  ON document_sections((metadata->>'type'));

CREATE INDEX IF NOT EXISTS idx_document_sections_article 
  ON document_sections((metadata->>'article_number'));

-- 5. Recriar função match_documents com assinatura correta
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_sections.id,
    document_sections.content,
    document_sections.metadata,
    1 - (document_sections.embedding <=> query_embedding) as similarity
  FROM document_sections
  WHERE document_sections.embedding IS NOT NULL
    AND 1 - (document_sections.embedding <=> query_embedding) > match_threshold
  ORDER BY document_sections.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. Criar função hybrid_search
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float,
  rank float
)
LANGUAGE sql STABLE
AS $$
  WITH vector_results AS (
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> query_embedding) as similarity
    FROM document_sections
    WHERE embedding IS NOT NULL 
      AND 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      id,
      content,
      metadata,
      ts_rank_cd(to_tsvector('portuguese', content), plainto_tsquery('portuguese', query_text)) as rank
    FROM document_sections
    WHERE to_tsvector('portuguese', content) @@ plainto_tsquery('portuguese', query_text)
    ORDER BY rank DESC
    LIMIT match_count * 2
  )
  SELECT DISTINCT ON (id)
    COALESCE(v.id, t.id) as id,
    COALESCE(v.content, t.content) as content,
    COALESCE(v.metadata, t.metadata) as metadata,
    COALESCE(v.similarity, 0) as similarity,
    COALESCE(t.rank, 0) as rank
  FROM vector_results v
  FULL OUTER JOIN text_results t ON v.id = t.id
  ORDER BY id, (COALESCE(v.similarity, 0) + COALESCE(t.rank, 0)) DESC
  LIMIT match_count;
$$;

-- 7. Garantir permissões
GRANT ALL ON document_sections TO authenticated;
GRANT ALL ON document_sections TO service_role;
GRANT ALL ON document_sections TO anon;

-- 8. Criar ou substituir trigger para updated_at
DROP TRIGGER IF EXISTS update_document_sections_updated_at ON document_sections;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_sections_updated_at 
  BEFORE UPDATE ON document_sections 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Verificação final
DO $$
DECLARE
  table_exists boolean;
  record_count integer;
BEGIN
  -- Verificar se a tabela existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'document_sections'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Contar registros
    SELECT COUNT(*) FROM document_sections INTO record_count;
    
    RAISE NOTICE '✅ Tabela document_sections criada/atualizada com sucesso!';
    RAISE NOTICE '📊 Total de registros existentes: %', record_count;
    
    -- Mostrar estrutura
    RAISE NOTICE '📋 Estrutura da tabela:';
    RAISE NOTICE '   - id (UUID)';
    RAISE NOTICE '   - content (TEXT)';
    RAISE NOTICE '   - embedding (vector(1536))';
    RAISE NOTICE '   - metadata (JSONB)';
    RAISE NOTICE '   - created_at (TIMESTAMPTZ)';
    RAISE NOTICE '   - updated_at (TIMESTAMPTZ)';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela document_sections';
  END IF;
END $$;

-- 10. Retornar informações sobre a tabela
SELECT 
  'document_sections' as table_name,
  COUNT(*) as total_records,
  pg_size_pretty(pg_total_relation_size('document_sections')) as table_size,
  COUNT(DISTINCT metadata->>'source_file') as unique_source_files
FROM document_sections;

-- 11. Listar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'document_sections'
ORDER BY indexname;