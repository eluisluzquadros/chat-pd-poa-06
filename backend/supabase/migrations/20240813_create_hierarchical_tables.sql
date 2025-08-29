-- ============================================================
-- MIGRAÇÃO: Criar Tabelas para Chunking Hierárquico e Knowledge Graph
-- Data: 13/08/2024
-- ============================================================

-- 1. Tabela de chunks hierárquicos para documentos legais
CREATE TABLE IF NOT EXISTS legal_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(100) NOT NULL,
    parent_chunk_id UUID REFERENCES legal_document_chunks(id) ON DELETE CASCADE,
    
    -- Níveis hierárquicos
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 8),
    level_type VARCHAR(20) NOT NULL CHECK (level_type IN (
        'lei', 'titulo', 'capitulo', 'secao', 'subsecao', 
        'artigo', 'paragrafo', 'inciso', 'alinea'
    )),
    
    -- Identificadores estruturais
    sequence_number INTEGER NOT NULL,
    numero_lei VARCHAR(50),
    numero_titulo VARCHAR(20),
    numero_capitulo VARCHAR(20),
    numero_secao VARCHAR(20),
    numero_subsecao VARCHAR(20),
    numero_artigo INTEGER,
    numero_paragrafo INTEGER,
    numero_inciso VARCHAR(10),
    letra_alinea CHAR(1),
    
    -- Conteúdo
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_summary TEXT,
    
    -- Embeddings
    embedding vector(1536),
    embedding_summary vector(1536),
    embedding_contextual vector(1536),
    
    -- Metadados e navegação
    metadata JSONB DEFAULT '{}',
    full_path TEXT,
    previous_chunk_id UUID REFERENCES legal_document_chunks(id),
    next_chunk_id UUID REFERENCES legal_document_chunks(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_legal_chunks_document ON legal_document_chunks(document_id);
CREATE INDEX idx_legal_chunks_parent ON legal_document_chunks(parent_chunk_id);
CREATE INDEX idx_legal_chunks_level ON legal_document_chunks(level, level_type);
CREATE INDEX idx_legal_chunks_artigo ON legal_document_chunks(numero_artigo) WHERE numero_artigo IS NOT NULL;
CREATE INDEX idx_legal_chunks_path ON legal_document_chunks(full_path);
CREATE INDEX idx_legal_chunks_sequence ON legal_document_chunks(parent_chunk_id, sequence_number);

-- Índice para busca vetorial (apenas níveis relevantes)
CREATE INDEX idx_legal_chunks_embedding ON legal_document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WHERE level_type IN ('artigo', 'paragrafo', 'secao') 
AND embedding IS NOT NULL;

-- 2. Tabela de cross-references entre chunks
CREATE TABLE IF NOT EXISTS chunk_cross_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_chunk_id UUID NOT NULL REFERENCES legal_document_chunks(id) ON DELETE CASCADE,
    target_chunk_id UUID NOT NULL REFERENCES legal_document_chunks(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN (
        'cita', 'modifica', 'revoga', 'regulamenta', 'define', 'referencia'
    )),
    reference_text TEXT,
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_chunk_id, target_chunk_id, reference_type)
);

CREATE INDEX idx_cross_ref_source ON chunk_cross_references(source_chunk_id);
CREATE INDEX idx_cross_ref_target ON chunk_cross_references(target_chunk_id);
CREATE INDEX idx_cross_ref_type ON chunk_cross_references(reference_type);

-- 3. Tabela do Knowledge Graph - Nós
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN (
        'law', 'article', 'zone', 'parameter', 'concept', 
        'neighborhood', 'restriction', 'instrument'
    )),
    label TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    embedding vector(1536),
    importance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kg_nodes_type ON knowledge_graph_nodes(node_type);
CREATE INDEX idx_kg_nodes_label ON knowledge_graph_nodes(label);
CREATE INDEX idx_kg_nodes_properties ON knowledge_graph_nodes USING gin(properties);
CREATE INDEX idx_kg_nodes_importance ON knowledge_graph_nodes(importance_score DESC);
CREATE INDEX idx_kg_nodes_embedding ON knowledge_graph_nodes 
USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- 4. Tabela do Knowledge Graph - Relações
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL CHECK (relationship_type IN (
        'DEFINES', 'REFERENCES', 'BELONGS_TO', 'HAS_PARAMETER', 
        'LOCATED_IN', 'MODIFIES', 'REVOKES', 'REGULATES',
        'CONTRADICTS', 'COMPLEMENTS', 'IMPLEMENTS'
    )),
    properties JSONB DEFAULT '{}',
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_id, target_id, relationship_type)
);

CREATE INDEX idx_kg_edges_source ON knowledge_graph_edges(source_id);
CREATE INDEX idx_kg_edges_target ON knowledge_graph_edges(target_id);
CREATE INDEX idx_kg_edges_type ON knowledge_graph_edges(relationship_type);
CREATE INDEX idx_kg_edges_weight ON knowledge_graph_edges(weight DESC);

-- 5. Tabela de memória de sessão para análise contextual
CREATE TABLE IF NOT EXISTS session_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    turn_number INTEGER NOT NULL,
    query TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    agent_results JSONB DEFAULT '{}',
    response TEXT,
    confidence FLOAT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, turn_number)
);

CREATE INDEX idx_session_memory_session ON session_memory(session_id, turn_number DESC);
CREATE INDEX idx_session_memory_timestamp ON session_memory(timestamp DESC);

-- 6. Tabela de cache de validação
CREATE TABLE IF NOT EXISTS validation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    validation_result JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE INDEX idx_validation_cache_hash ON validation_cache(query_hash);
CREATE INDEX idx_validation_cache_expires ON validation_cache(expires_at) WHERE expires_at IS NOT NULL;

-- 7. Função para criar tabela se não existir (usada pelo script)
CREATE OR REPLACE FUNCTION create_legal_chunks_table_if_not_exists()
RETURNS void AS $$
BEGIN
    -- A tabela já foi criada acima, esta função é para compatibilidade
    RAISE NOTICE 'Tabelas de chunking hierárquico já existem';
END;
$$ LANGUAGE plpgsql;

-- 8. Função para traversal do Knowledge Graph
CREATE OR REPLACE FUNCTION traverse_knowledge_graph(
    start_node_label TEXT,
    max_depth INTEGER DEFAULT 3,
    relationship_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    node_id UUID,
    node_label TEXT,
    node_type VARCHAR(50),
    depth INTEGER,
    path TEXT[]
) AS $$
WITH RECURSIVE graph_traversal AS (
    -- Nó inicial
    SELECT 
        n.id as node_id,
        n.label as node_label,
        n.node_type,
        0 as depth,
        ARRAY[n.label] as path
    FROM knowledge_graph_nodes n
    WHERE n.label = start_node_label
    
    UNION ALL
    
    -- Recursão
    SELECT 
        n.id,
        n.label,
        n.node_type,
        gt.depth + 1,
        gt.path || n.label
    FROM knowledge_graph_nodes n
    JOIN knowledge_graph_edges e ON n.id = e.target_id
    JOIN graph_traversal gt ON e.source_id = gt.node_id
    WHERE gt.depth < max_depth
        AND (relationship_types IS NULL OR e.relationship_type = ANY(relationship_types))
        AND NOT n.label = ANY(gt.path) -- Evitar ciclos
)
SELECT * FROM graph_traversal;
$$ LANGUAGE sql;

-- 9. Função para buscar contexto hierárquico completo
CREATE OR REPLACE FUNCTION get_hierarchical_context(chunk_id UUID)
RETURNS TABLE (
    id UUID,
    level INTEGER,
    level_type VARCHAR(20),
    title TEXT,
    content TEXT,
    full_path TEXT
) AS $$
WITH RECURSIVE context_path AS (
    -- Chunk inicial
    SELECT * FROM legal_document_chunks WHERE id = chunk_id
    
    UNION ALL
    
    -- Subir na hierarquia
    SELECT ldc.* 
    FROM legal_document_chunks ldc
    JOIN context_path cp ON ldc.id = cp.parent_chunk_id
)
SELECT 
    id, level, level_type, title, 
    CASE 
        WHEN length(content) > 500 THEN substring(content, 1, 500) || '...'
        ELSE content
    END as content,
    full_path
FROM context_path
ORDER BY level;
$$ LANGUAGE sql;

-- 10. Função para buscar artigos relacionados
CREATE OR REPLACE FUNCTION find_related_articles(
    artigo_numero INTEGER,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    numero_artigo INTEGER,
    title TEXT,
    content TEXT,
    relationship_type VARCHAR(50),
    relevance FLOAT
) AS $$
SELECT DISTINCT
    ldc.id,
    ldc.numero_artigo,
    ldc.title,
    ldc.content,
    ccr.reference_type as relationship_type,
    ccr.confidence as relevance
FROM legal_document_chunks ldc
JOIN chunk_cross_references ccr ON ldc.id = ccr.target_chunk_id
WHERE ccr.source_chunk_id IN (
    SELECT id FROM legal_document_chunks 
    WHERE numero_artigo = artigo_numero 
    AND level_type = 'artigo'
)
ORDER BY ccr.confidence DESC
LIMIT max_results;
$$ LANGUAGE sql;

-- 11. Popular Knowledge Graph inicial com conceitos críticos
INSERT INTO knowledge_graph_nodes (node_type, label, properties, importance_score)
VALUES 
    ('law', 'LUOS', '{"full_name": "Lei de Uso e Ocupação do Solo", "year": 2025}', 1.0),
    ('law', 'PDUS', '{"full_name": "Plano Diretor Urbano Sustentável", "year": 2025}', 1.0),
    ('concept', 'EIV', '{"full_name": "Estudo de Impacto de Vizinhança"}', 0.9),
    ('concept', 'ZEIS', '{"full_name": "Zonas Especiais de Interesse Social"}', 0.9),
    ('concept', 'Outorga Onerosa', '{"description": "Instrumento de política urbana"}', 0.8),
    ('concept', 'APP', '{"full_name": "Área de Preservação Permanente"}', 0.8)
ON CONFLICT DO NOTHING;

-- 12. Criar relações iniciais
INSERT INTO knowledge_graph_edges (source_id, target_id, relationship_type, weight)
SELECT 
    (SELECT id FROM knowledge_graph_nodes WHERE label = 'LUOS'),
    (SELECT id FROM knowledge_graph_nodes WHERE label = 'EIV'),
    'DEFINES',
    1.0
WHERE EXISTS (SELECT 1 FROM knowledge_graph_nodes WHERE label = 'LUOS')
  AND EXISTS (SELECT 1 FROM knowledge_graph_nodes WHERE label = 'EIV')
ON CONFLICT DO NOTHING;

-- 13. Comentários nas tabelas
COMMENT ON TABLE legal_document_chunks IS 'Armazena chunks hierárquicos de documentos legais com preservação de contexto';
COMMENT ON TABLE chunk_cross_references IS 'Mapeia referências cruzadas entre artigos e seções';
COMMENT ON TABLE knowledge_graph_nodes IS 'Nós do Knowledge Graph representando conceitos legais e urbanísticos';
COMMENT ON TABLE knowledge_graph_edges IS 'Relações entre conceitos no Knowledge Graph';
COMMENT ON TABLE session_memory IS 'Memória de sessão para análise contextual em conversações';
COMMENT ON TABLE validation_cache IS 'Cache de validações para otimização de performance';

-- ============================================================
-- FIM DA MIGRAÇÃO
-- Para executar: 
-- psql -U postgres -d seu_banco -f 20240813_create_hierarchical_tables.sql
-- ============================================================