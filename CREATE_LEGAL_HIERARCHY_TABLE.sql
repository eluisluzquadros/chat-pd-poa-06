-- =====================================================
-- CRIAR TABELA PARA TODA HIERARQUIA LEGAL
-- =====================================================
-- Execute este SQL no Supabase Dashboard
-- =====================================================

-- Criar tabela unificada para TODOS os elementos hierárquicos
CREATE TABLE IF NOT EXISTS legal_hierarchy (
  id SERIAL PRIMARY KEY,
  
  -- Tipo do elemento
  element_type TEXT NOT NULL, -- 'parte', 'titulo', 'capitulo', 'secao', 'artigo', 'paragrafo', 'inciso', 'alinea'
  hierarchy_level INTEGER NOT NULL, -- 1=parte, 2=titulo, 3=capitulo, etc.
  
  -- Identificação
  document_type TEXT NOT NULL, -- 'PDUS' ou 'LUOS'
  element_number TEXT, -- Número/letra do elemento (pode ser romano, árabe ou letra)
  element_title TEXT, -- Título/nome do elemento
  
  -- Conteúdo
  full_content TEXT NOT NULL, -- Conteúdo completo
  summary TEXT, -- Resumo do conteúdo (opcional)
  
  -- Hierarquia (referências aos pais)
  parent_id INTEGER REFERENCES legal_hierarchy(id),
  parte_ref TEXT,
  titulo_ref TEXT,
  capitulo_ref TEXT,
  secao_ref TEXT,
  artigo_ref INTEGER,
  
  -- Busca e indexação
  keywords TEXT[],
  embedding vector(1536),
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único para evitar duplicatas
  UNIQUE(document_type, element_type, element_number, artigo_ref)
);

-- Criar índices para performance
CREATE INDEX idx_legal_hierarchy_type ON legal_hierarchy(element_type);
CREATE INDEX idx_legal_hierarchy_doc ON legal_hierarchy(document_type);
CREATE INDEX idx_legal_hierarchy_level ON legal_hierarchy(hierarchy_level);
CREATE INDEX idx_legal_hierarchy_parent ON legal_hierarchy(parent_id);
CREATE INDEX idx_legal_hierarchy_artigo ON legal_hierarchy(artigo_ref);
CREATE INDEX idx_legal_hierarchy_keywords ON legal_hierarchy USING GIN(keywords);
CREATE INDEX idx_legal_hierarchy_metadata ON legal_hierarchy USING GIN(metadata);

-- Índice para busca vetorial
CREATE INDEX idx_legal_hierarchy_embedding 
  ON legal_hierarchy 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Função para buscar elementos similares
CREATE OR REPLACE FUNCTION search_legal_hierarchy(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL,
  filter_doc TEXT DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  element_type TEXT,
  document_type TEXT,
  full_content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lh.id,
    lh.element_type,
    lh.document_type,
    lh.full_content,
    lh.metadata,
    1 - (lh.embedding <=> query_embedding) AS similarity
  FROM legal_hierarchy lh
  WHERE 
    lh.embedding IS NOT NULL
    AND 1 - (lh.embedding <=> query_embedding) > match_threshold
    AND (filter_type IS NULL OR lh.element_type = filter_type)
    AND (filter_doc IS NULL OR lh.document_type = filter_doc)
  ORDER BY lh.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para obter hierarquia completa de um elemento
CREATE OR REPLACE FUNCTION get_element_hierarchy(element_id INTEGER)
RETURNS TABLE (
  level INTEGER,
  id INTEGER,
  element_type TEXT,
  element_number TEXT,
  element_title TEXT,
  full_content TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Elemento inicial
    SELECT 
      0 as level,
      lh.id,
      lh.element_type,
      lh.element_number,
      lh.element_title,
      lh.full_content,
      lh.parent_id
    FROM legal_hierarchy lh
    WHERE lh.id = element_id
    
    UNION ALL
    
    -- Elementos pais recursivamente
    SELECT 
      h.level - 1,
      lh.id,
      lh.element_type,
      lh.element_number,
      lh.element_title,
      lh.full_content,
      lh.parent_id
    FROM legal_hierarchy lh
    INNER JOIN hierarchy h ON lh.id = h.parent_id
  )
  SELECT 
    h.level,
    h.id,
    h.element_type,
    h.element_number,
    h.element_title,
    h.full_content
  FROM hierarchy h
  ORDER BY h.level;
END;
$$;

-- Permissões
GRANT ALL ON legal_hierarchy TO postgres;
GRANT SELECT ON legal_hierarchy TO anon;
GRANT SELECT ON legal_hierarchy TO authenticated;
GRANT ALL ON legal_hierarchy TO service_role;

-- Comentários
COMMENT ON TABLE legal_hierarchy IS 'Tabela unificada para toda hierarquia legal do PDPOA (Partes, Títulos, Capítulos, Seções, Artigos, Parágrafos, Incisos, Alíneas)';
COMMENT ON COLUMN legal_hierarchy.element_type IS 'Tipo do elemento: parte, titulo, capitulo, secao, artigo, paragrafo, inciso, alinea';
COMMENT ON COLUMN legal_hierarchy.hierarchy_level IS 'Nível hierárquico: 1=parte, 2=titulo, 3=capitulo, 4=secao, 5=artigo, 6=paragrafo, 7=inciso, 8=alinea';

-- Verificar criação
SELECT 
  'Tabela legal_hierarchy criada com sucesso!' as status,
  COUNT(*) as total_registros
FROM legal_hierarchy;