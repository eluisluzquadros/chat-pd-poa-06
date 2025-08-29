-- ============================================
-- SCRIPT PARA CRIAR TABELA DOCUMENT_SECTIONS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Habilitar extensão vector (necessária para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela document_sections
CREATE TABLE IF NOT EXISTS public.document_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para otimizar buscas
-- Índice para busca textual em português
CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
  ON document_sections USING gin(to_tsvector('portuguese', content));

-- Índice para metadados JSON
CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
  ON document_sections USING gin(metadata jsonb_path_ops);

-- Índice para busca por arquivo fonte
CREATE INDEX IF NOT EXISTS idx_document_sections_source 
  ON document_sections((metadata->>'source_file'));

-- Índice para busca por tipo de conteúdo
CREATE INDEX IF NOT EXISTS idx_document_sections_type 
  ON document_sections((metadata->>'type'));

-- Índice para busca por número de artigo (documentos legais)
CREATE INDEX IF NOT EXISTS idx_document_sections_article 
  ON document_sections((metadata->>'article_number'));

-- 4. Criar função para busca vetorial (se não existir)
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
  WHERE 1 - (document_sections.embedding <=> query_embedding) > match_threshold
  ORDER BY document_sections.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 5. Criar função para busca híbrida (vetorial + keyword)
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
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
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

-- 6. Garantir permissões adequadas
GRANT ALL ON document_sections TO authenticated;
GRANT ALL ON document_sections TO service_role;
GRANT ALL ON document_sections TO anon;

-- 7. Criar trigger para atualizar updated_at
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

-- 8. Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela criada com sucesso!' as status,
  COUNT(*) as total_registros
FROM document_sections;

-- 9. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'document_sections'
ORDER BY ordinal_position;