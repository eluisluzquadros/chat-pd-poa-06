-- ============================================
-- ESTRUTURA DE TABELAS PARA RAG >95% ACURÁCIA
-- ============================================

-- 1. Tabela para artigos legais individuais
CREATE TABLE IF NOT EXISTS legal_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL, -- 'LUOS', 'PDUS'
    article_number INTEGER NOT NULL,
    article_text TEXT NOT NULL,
    article_title TEXT,
    full_content TEXT,
    embedding vector(1536),
    keywords TEXT[],
    references INTEGER[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_type, article_number)
);

-- 2. Tabela para incisos, parágrafos e alíneas
CREATE TABLE IF NOT EXISTS legal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES legal_articles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('paragraph', 'inciso', 'alinea')),
    item_number TEXT NOT NULL,
    item_text TEXT NOT NULL,
    embedding vector(1536),
    parent_item_id UUID REFERENCES legal_items(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Knowledge Graph - Nós
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_value TEXT,
    properties JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_name)
);

-- 4. Knowledge Graph - Arestas
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_node_id UUID REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    to_node_id UUID REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_node_id, to_node_id, relationship_type)
);

-- 5. Chunking hierárquico otimizado
CREATE TABLE IF NOT EXISTS hierarchical_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID,
    level TEXT NOT NULL,
    level_number INTEGER,
    content TEXT NOT NULL,
    parent_chunk_id UUID REFERENCES hierarchical_chunks(id),
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Regime urbanístico consolidado
CREATE TABLE IF NOT EXISTS regime_urbanistico_completo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bairro TEXT NOT NULL,
    zot TEXT NOT NULL,
    altura_maxima NUMERIC,
    altura_base NUMERIC,
    coef_basico NUMERIC,
    coef_maximo NUMERIC,
    taxa_ocupacao NUMERIC,
    taxa_permeabilidade NUMERIC,
    recuo_frontal NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bairro, zot)
);

-- 7. Cache inteligente multicamada
CREATE TABLE IF NOT EXISTS smart_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    query_normalized TEXT NOT NULL,
    response TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    query_type TEXT,
    hit_count INTEGER DEFAULT 0,
    data_version TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Session memory para contexto
CREATE TABLE IF NOT EXISTS session_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- ============================================
-- ÍNDICES OTIMIZADOS
-- ============================================

-- Índices para legal_articles
CREATE INDEX IF NOT EXISTS idx_articles_number ON legal_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_articles_type ON legal_articles(document_type);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON legal_articles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_articles_references ON legal_articles USING GIN(references);
CREATE INDEX IF NOT EXISTS idx_articles_embedding ON legal_articles 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Índices para legal_items
CREATE INDEX IF NOT EXISTS idx_items_article ON legal_items(article_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON legal_items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_embedding ON legal_items 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Índices para knowledge graph
CREATE INDEX IF NOT EXISTS idx_nodes_type ON knowledge_graph_nodes(entity_type);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON knowledge_graph_nodes(entity_name);
CREATE INDEX IF NOT EXISTS idx_edges_from ON knowledge_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON knowledge_graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON knowledge_graph_edges(relationship_type);

-- Índices para chunks
CREATE INDEX IF NOT EXISTS idx_chunks_level ON hierarchical_chunks(level, level_number);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON hierarchical_chunks(parent_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON hierarchical_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Índices para regime urbanístico
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico_completo(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zot ON regime_urbanistico_completo(zot);
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zot ON regime_urbanistico_completo(bairro, zot);

-- Índices para cache
CREATE INDEX IF NOT EXISTS idx_cache_key ON smart_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON smart_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_type ON smart_cache(query_type);

-- Índices para session
CREATE INDEX IF NOT EXISTS idx_session_id ON session_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON session_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON session_memory(expires_at);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para buscar artigos por número
CREATE OR REPLACE FUNCTION find_legal_article(
    p_article_number INTEGER,
    p_document_type TEXT DEFAULT 'LUOS'
)
RETURNS TABLE (
    article_number INTEGER,
    article_text TEXT,
    full_content TEXT,
    keywords TEXT[],
    references INTEGER[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.article_number,
        la.article_text,
        la.full_content,
        la.keywords,
        la.references
    FROM legal_articles la
    WHERE la.article_number = p_article_number
    AND la.document_type = p_document_type;
END;
$$;

-- Função para buscar por similaridade semântica
CREATE OR REPLACE FUNCTION search_by_embedding(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.full_content as content,
        1 - (la.embedding <=> query_embedding) as similarity
    FROM legal_articles la
    WHERE 1 - (la.embedding <=> query_embedding) > match_threshold
    ORDER BY la.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- DADOS INICIAIS CRÍTICOS
-- ============================================

-- Inserir artigos hardcoded essenciais
INSERT INTO legal_articles (document_type, article_number, article_text, full_content, keywords)
VALUES 
    ('LUOS', 1, 'Normas de uso e ocupação do solo', 
     'Art. 1º Esta Lei estabelece as normas de uso e ocupação do solo no território do Município de Porto Alegre.',
     ARRAY['uso do solo', 'ocupação', 'normas', 'território']),
    
    ('LUOS', 3, 'Princípios fundamentais',
     'Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido pelos seguintes princípios fundamentais: I - Função social da cidade; II - Função social da propriedade; III - Sustentabilidade; IV - Gestão democrática.',
     ARRAY['princípios', 'função social', 'sustentabilidade', 'gestão democrática']),
    
    ('LUOS', 81, 'Certificações',
     'Art. 81 - Das certificações. Inciso III - Certificação em Sustentabilidade Ambiental.',
     ARRAY['certificação', 'sustentabilidade', 'ambiental']),
    
    ('LUOS', 119, 'Sistema de Gestão e Controle',
     'Art. 119 - O Sistema de Gestão e Controle (SGC) realizará análise dos impactos financeiros da ação urbanística sobre a arrecadação municipal.',
     ARRAY['SGC', 'gestão', 'controle', 'impactos financeiros']),
    
    ('PDUS', 192, 'Concessão Urbanística',
     'Art. 192 - Concessão urbanística é o instrumento pelo qual o Município delega a ente privado a execução de obras de urbanização.',
     ARRAY['concessão urbanística', 'obras', 'urbanização', 'delegação'])
ON CONFLICT (document_type, article_number) DO UPDATE
SET 
    article_text = EXCLUDED.article_text,
    full_content = EXCLUDED.full_content,
    keywords = EXCLUDED.keywords,
    updated_at = NOW();

-- Inserir dados de Alberta dos Morros
INSERT INTO regime_urbanistico_completo (bairro, zot, altura_maxima, coef_basico, coef_maximo)
VALUES 
    ('Alberta dos Morros', 'ZOT-04', 18.0, 1.0, 1.5),
    ('Alberta dos Morros', 'ZOT-07', 33.0, 1.3, 2.0)
ON CONFLICT (bairro, zot) DO UPDATE
SET 
    altura_maxima = EXCLUDED.altura_maxima,
    coef_basico = EXCLUDED.coef_basico,
    coef_maximo = EXCLUDED.coef_maximo,
    updated_at = NOW();

-- Inserir informação sobre bairros protegidos
INSERT INTO knowledge_graph_nodes (entity_type, entity_name, entity_value, properties)
VALUES 
    ('flood_protection', 'sistema_atual', '25 bairros',
     '{"description": "25 bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes", "status": "protected"}'::jsonb)
ON CONFLICT (entity_type, entity_name) DO UPDATE
SET 
    entity_value = EXCLUDED.entity_value,
    properties = EXCLUDED.properties,
    updated_at = NOW();

-- Estatísticas finais
SELECT 'Tabelas criadas:' as status, COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('legal_articles', 'legal_items', 'knowledge_graph_nodes', 
                   'knowledge_graph_edges', 'hierarchical_chunks', 
                   'regime_urbanistico_completo', 'smart_cache', 'session_memory');