-- =====================================================
-- CRIAR TABELA LEGAL_ARTICLES PARA BASE DE CONHECIMENTO
-- =====================================================
-- Execute este SQL no Supabase Dashboard -> SQL Editor
-- =====================================================

-- 1. Criar a tabela legal_articles
CREATE TABLE IF NOT EXISTS public.legal_articles (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_legal_articles_metadata 
  ON public.legal_articles USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_legal_articles_created_at 
  ON public.legal_articles (created_at DESC);

-- 3. Criar índice para busca vetorial (se pgvector estiver instalado)
CREATE INDEX IF NOT EXISTS idx_legal_articles_embedding 
  ON public.legal_articles 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- 4. Função para buscar artigos por similaridade
CREATE OR REPLACE FUNCTION public.match_legal_articles(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.content,
    la.metadata,
    1 - (la.embedding <=> query_embedding) AS similarity
  FROM public.legal_articles la
  WHERE la.embedding IS NOT NULL
    AND 1 - (la.embedding <=> query_embedding) > match_threshold
  ORDER BY la.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_legal_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_legal_articles_updated_at ON public.legal_articles;
CREATE TRIGGER update_legal_articles_updated_at
  BEFORE UPDATE ON public.legal_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_legal_articles_updated_at();

-- 6. Definir permissões
GRANT ALL ON public.legal_articles TO postgres;
GRANT SELECT ON public.legal_articles TO anon;
GRANT SELECT ON public.legal_articles TO authenticated;
GRANT ALL ON public.legal_articles TO service_role;

-- 7. Adicionar comentários para documentação
COMMENT ON TABLE public.legal_articles IS 'Armazena artigos legais do PDPOA com embeddings para busca semântica';
COMMENT ON COLUMN public.legal_articles.id IS 'Identificador único do artigo';
COMMENT ON COLUMN public.legal_articles.content IS 'Conteúdo completo do artigo';
COMMENT ON COLUMN public.legal_articles.embedding IS 'Embedding vetorial para busca semântica';
COMMENT ON COLUMN public.legal_articles.metadata IS 'Metadados JSON incluindo número do artigo, seção, tipo de documento, etc.';

-- 8. Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela legal_articles criada com sucesso!' as status,
  COUNT(*) as total_registros
FROM public.legal_articles;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================