-- =====================================================
-- CRIAR FUNÇÃO RPC PARA BUSCAR NA TABELA legal_articles
-- =====================================================
-- Execute este SQL no Supabase Dashboard
-- =====================================================

-- Criar função para buscar artigos e hierarquia por similaridade
CREATE OR REPLACE FUNCTION match_legal_articles(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  document_type TEXT,
  article_number INTEGER,
  full_content TEXT,
  article_text TEXT,
  keywords TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.document_type,
    la.article_number,
    la.full_content,
    la.article_text,
    la.keywords,
    1 - (la.embedding <=> query_embedding) AS similarity
  FROM legal_articles la
  WHERE 
    la.embedding IS NOT NULL
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar função especializada para buscar apenas artigos reais (não hierarquia)
CREATE OR REPLACE FUNCTION match_legal_articles_only(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  document_type TEXT,
  article_number INTEGER,
  full_content TEXT,
  article_text TEXT,
  keywords TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.document_type,
    la.article_number,
    la.full_content,
    la.article_text,
    la.keywords,
    1 - (la.embedding <=> query_embedding) AS similarity
  FROM legal_articles la
  WHERE 
    la.embedding IS NOT NULL
    AND la.article_number < 9000  -- Apenas artigos reais
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar função para buscar apenas elementos hierárquicos
CREATE OR REPLACE FUNCTION match_legal_hierarchy(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  document_type TEXT,
  article_number INTEGER,
  full_content TEXT,
  article_text TEXT,
  keywords TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.document_type,
    la.article_number,
    la.full_content,
    la.article_text,
    la.keywords,
    1 - (la.embedding <=> query_embedding) AS similarity
  FROM legal_articles la
  WHERE 
    la.embedding IS NOT NULL
    AND la.article_number >= 9000  -- Apenas elementos hierárquicos
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar função para buscar por tipo de documento
CREATE OR REPLACE FUNCTION match_legal_by_document(
  query_embedding vector(1536),
  doc_type TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  document_type TEXT,
  article_number INTEGER,
  full_content TEXT,
  article_text TEXT,
  keywords TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.document_type,
    la.article_number,
    la.full_content,
    la.article_text,
    la.keywords,
    1 - (la.embedding <=> query_embedding) AS similarity
  FROM legal_articles la
  WHERE 
    la.embedding IS NOT NULL
    AND la.document_type = doc_type
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION match_legal_articles TO anon;
GRANT EXECUTE ON FUNCTION match_legal_articles TO authenticated;
GRANT EXECUTE ON FUNCTION match_legal_articles TO service_role;

GRANT EXECUTE ON FUNCTION match_legal_articles_only TO anon;
GRANT EXECUTE ON FUNCTION match_legal_articles_only TO authenticated;
GRANT EXECUTE ON FUNCTION match_legal_articles_only TO service_role;

GRANT EXECUTE ON FUNCTION match_legal_hierarchy TO anon;
GRANT EXECUTE ON FUNCTION match_legal_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION match_legal_hierarchy TO service_role;

GRANT EXECUTE ON FUNCTION match_legal_by_document TO anon;
GRANT EXECUTE ON FUNCTION match_legal_by_document TO authenticated;
GRANT EXECUTE ON FUNCTION match_legal_by_document TO service_role;

-- Verificar criação
SELECT 'Funções RPC criadas com sucesso!' as status;