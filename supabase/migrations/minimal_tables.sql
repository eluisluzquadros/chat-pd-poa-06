-- Simple SQL to create minimal tables for Agentic-RAG testing
-- Execute this directly in Supabase SQL Editor

-- 1. Legal document chunks table
CREATE TABLE IF NOT EXISTS legal_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(100) NOT NULL,
    parent_chunk_id UUID,
    level INTEGER NOT NULL,
    level_type VARCHAR(20) NOT NULL,
    sequence_number INTEGER NOT NULL,
    numero_artigo INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    full_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Knowledge Graph nodes
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(50) NOT NULL,
    label TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    embedding vector(1536),
    importance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Knowledge Graph edges
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Session memory
CREATE TABLE IF NOT EXISTS session_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    turn_number INTEGER NOT NULL,
    query TEXT NOT NULL,
    response TEXT,
    confidence FLOAT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Cross references
CREATE TABLE IF NOT EXISTS chunk_cross_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_chunk_id UUID NOT NULL REFERENCES legal_document_chunks(id) ON DELETE CASCADE,
    target_chunk_id UUID NOT NULL REFERENCES legal_document_chunks(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL,
    reference_text TEXT,
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Validation cache
CREATE TABLE IF NOT EXISTS validation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    validation_result JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_legal_chunks_artigo ON legal_document_chunks(numero_artigo) WHERE numero_artigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_chunks_document ON legal_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON knowledge_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_label ON knowledge_graph_nodes(label);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON knowledge_graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON knowledge_graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_session_memory_session ON session_memory(session_id, turn_number DESC);

-- Add unique constraints before inserting data
ALTER TABLE knowledge_graph_nodes ADD CONSTRAINT unique_kg_label UNIQUE (label);
ALTER TABLE legal_document_chunks ADD CONSTRAINT unique_chunk_path UNIQUE (full_path);

-- Insert basic test data
INSERT INTO knowledge_graph_nodes (node_type, label, properties) VALUES
('law', 'LUOS', '{"full_name": "Lei de Uso e Ocupação do Solo"}'),
('law', 'PDUS', '{"full_name": "Plano Diretor Urbano Sustentável"}'),
('article', 'LUOS - Art. 89', '{"number": 89, "law": "LUOS"}'),
('article', 'PDUS - Art. 92', '{"number": 92, "law": "PDUS"}'),
('article', 'LUOS - Art. 86', '{"number": 86, "law": "LUOS"}'),
('article', 'LUOS - Art. 82', '{"number": 82, "law": "LUOS"}'),
('concept', 'EIV', '{"full_name": "Estudo de Impacto de Vizinhança"}'),
('concept', 'ZEIS', '{"full_name": "Zonas Especiais de Interesse Social"}'),
('concept', 'Outorga Onerosa', '{"description": "Instrumento de política urbana"}'),
('concept', 'Coeficiente de Aproveitamento', '{"description": "Relação entre área edificável e área do terreno"}'),
('zone', 'ZOT 08.1', '{"name": "Zona de Ocupação Tradicional 08.1"}'),
('neighborhood', 'Centro Histórico', '{"zone": "ZOT 08.1", "altitude_max": 130}'),
('neighborhood', 'Boa Vista', '{"zone": "Multiple", "altitude_max": 90}')
ON CONFLICT (label) DO NOTHING;

-- Insert legal chunks
INSERT INTO legal_document_chunks (document_id, level, level_type, sequence_number, numero_artigo, title, content, full_path) VALUES
('LUOS-2025', 6, 'artigo', 89, 89, 'Art. 89º - Estudo de Impacto de Vizinhança (EIV)', 'O Estudo de Impacto de Vizinhança (EIV) é um instrumento de avaliação dos impactos de empreendimentos ou atividades no meio urbano.', 'LUOS/TITULO_VI/CAPITULO_I/SECAO_II/Art_89'),
('PDUS-2025', 6, 'artigo', 92, 92, 'Art. 92º - Zonas Especiais de Interesse Social (ZEIS)', 'As Zonas Especiais de Interesse Social (ZEIS) são porções do território destinadas predominantemente à população de baixa renda.', 'PDUS/TITULO_IV/CAPITULO_II/Art_92'),
('LUOS-2025', 6, 'artigo', 86, 86, 'Art. 86º - Outorga Onerosa do Direito de Construir', 'A outorga onerosa do direito de construir é o instrumento jurídico que permite ao proprietário de um terreno exercer o direito de construir acima do coeficiente de aproveitamento básico.', 'LUOS/TITULO_VI/CAPITULO_I/Art_86'),
('LUOS-2025', 6, 'artigo', 82, 82, 'Art. 82º - Coeficiente de Aproveitamento', 'O coeficiente de aproveitamento é a relação entre a área edificável e a área do terreno.', 'LUOS/TITULO_V/CAPITULO_II/Art_82')
ON CONFLICT (full_path) DO NOTHING;

-- Insert knowledge graph edges
WITH node_pairs AS (
  SELECT 
    s.id as source_id, 
    t.id as target_id,
    'DEFINES' as relationship_type
  FROM knowledge_graph_nodes s, knowledge_graph_nodes t
  WHERE (s.label = 'LUOS - Art. 89' AND t.label = 'EIV')
     OR (s.label = 'PDUS - Art. 92' AND t.label = 'ZEIS')
     OR (s.label = 'LUOS - Art. 86' AND t.label = 'Outorga Onerosa')
     OR (s.label = 'LUOS - Art. 82' AND t.label = 'Coeficiente de Aproveitamento')
)
INSERT INTO knowledge_graph_edges (source_id, target_id, relationship_type, weight)
SELECT source_id, target_id, relationship_type, 1.0
FROM node_pairs;