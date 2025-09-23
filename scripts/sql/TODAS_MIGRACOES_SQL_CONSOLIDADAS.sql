-- =====================================================
-- MIGRAÇÕES SQL CONSOLIDADAS - CHAT PD POA
-- Data: 31/01/2025
-- Total: 7 migrações principais
-- =====================================================

-- IMPORTANTE: Execute no Supabase SQL Editor na ordem apresentada
-- Dashboard: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

-- =====================================================
-- 1. SISTEMA DE CACHE AVANÇADO
-- =====================================================

-- Estrutura aprimorada da tabela query_cache
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS ttl_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) DEFAULT 0.80,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS hit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Índices otimizados para cache
CREATE INDEX IF NOT EXISTS idx_query_cache_query_pattern ON query_cache USING gin(query gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_query_cache_category ON query_cache(category);
CREATE INDEX IF NOT EXISTS idx_query_cache_confidence ON query_cache(confidence_score);
CREATE INDEX IF NOT EXISTS idx_query_cache_created ON query_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_category_expires ON query_cache(category, expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hit_count ON query_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_metadata ON query_cache USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_query_cache_query_category ON query_cache(query, category);
CREATE INDEX IF NOT EXISTS idx_query_cache_compound ON query_cache(category, confidence_score, expires_at);

-- Função de limpeza automática
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_cache 
    WHERE expires_at < NOW() 
    OR (hit_count = 0 AND created_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. ÍNDICES COMPOSTOS OTIMIZADOS
-- =====================================================

-- Índices principais para document_embeddings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_vector_composite 
ON document_embeddings(document_id, chunk_metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_hierarchical 
ON document_embeddings(document_id, embedding) 
WHERE chunk_metadata IS NOT NULL;

-- Índices específicos para queries de altura/gabarito
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_altura_queries 
ON document_embeddings USING gin(content_chunk gin_trgm_ops)
WHERE content_chunk ILIKE ANY(ARRAY['%altura%', '%gabarito%', '%elevação%', '%limite vertical%']);

-- Índices para metadata JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_metadata_gin 
ON document_embeddings USING gin(chunk_metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_metadata_path_ops 
ON document_embeddings USING gin(chunk_metadata jsonb_path_ops);

-- Índices para queries de bairros específicos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_bairros_cristal 
ON document_embeddings USING gin(content_chunk gin_trgm_ops)
WHERE content_chunk ILIKE '%cristal%';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_bairros_petropolis 
ON document_embeddings USING gin(content_chunk gin_trgm_ops)
WHERE content_chunk ILIKE '%petrópolis%' OR content_chunk ILIKE '%petropolis%';

-- Índice vetorial otimizado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_vector_cosine 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- 3. OTIMIZAÇÃO MATCH_HIERARCHICAL_DOCUMENTS
-- =====================================================

-- Cache dedicado para match_hierarchical
CREATE TABLE IF NOT EXISTS match_hierarchical_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    performance_mode TEXT DEFAULT 'balanced',
    results JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 minutes',
    hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_mhc_query_hash ON match_hierarchical_cache(query_hash);
CREATE INDEX idx_mhc_expires ON match_hierarchical_cache(expires_at);

-- Função otimizada match_hierarchical_documents_v2
CREATE OR REPLACE FUNCTION match_hierarchical_documents_v2(
    query_text TEXT,
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 10,
    metadata_filter JSONB DEFAULT NULL,
    performance_mode TEXT DEFAULT 'balanced'
)
RETURNS TABLE (
    id BIGINT,
    document_id BIGINT,
    content_chunk TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    -- Versão otimizada com CTEs e cache
    RETURN QUERY
    WITH performance_params AS (
        SELECT 
            CASE performance_mode
                WHEN 'speed' THEN 0.85
                WHEN 'quality' THEN 0.70
                ELSE 0.78
            END as threshold,
            CASE performance_mode
                WHEN 'speed' THEN 5
                WHEN 'quality' THEN 20
                ELSE 10
            END as limit_count
    ),
    filtered_candidates AS (
        SELECT de.*
        FROM document_embeddings de
        WHERE 
            (metadata_filter IS NULL OR de.chunk_metadata @> metadata_filter)
            AND de.content_chunk IS NOT NULL
        LIMIT 1000
    )
    SELECT 
        fc.id,
        fc.document_id,
        fc.content_chunk,
        fc.chunk_metadata as metadata,
        1 - (fc.embedding <=> query_embedding) as similarity
    FROM filtered_candidates fc,
         performance_params pp,
         LATERAL (
            SELECT embedding as query_embedding
            FROM document_embeddings
            WHERE content_chunk ILIKE '%' || query_text || '%'
            LIMIT 1
         ) qe
    WHERE 1 - (fc.embedding <=> qe.query_embedding) >= pp.threshold
    ORDER BY similarity DESC
    LIMIT pp.limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. SISTEMA DE FEEDBACK AVANÇADO
-- =====================================================

-- Tabelas do sistema de feedback
CREATE TABLE IF NOT EXISTS feedback_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE,
    total_messages INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    satisfaction_rate NUMERIC(5,2),
    avg_response_time NUMERIC(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    total_uses INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    avg_satisfaction NUMERIC(5,2),
    avg_response_time NUMERIC(10,2),
    metadata JSONB DEFAULT '{}',
    date DATE DEFAULT CURRENT_DATE,
    UNIQUE(model_name, date)
);

-- Índices para feedback
CREATE INDEX idx_feedback_alerts_session ON feedback_alerts(session_id);
CREATE INDEX idx_feedback_alerts_severity ON feedback_alerts(severity) WHERE NOT resolved;
CREATE INDEX idx_feedback_alerts_created ON feedback_alerts(created_at DESC);
CREATE INDEX idx_session_metrics_satisfaction ON session_quality_metrics(satisfaction_rate);
CREATE INDEX idx_model_metrics_date ON model_performance_metrics(date DESC);

-- Trigger para atualizar métricas
CREATE OR REPLACE FUNCTION update_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'messages' AND NEW.feedback IS NOT NULL THEN
        INSERT INTO session_quality_metrics (session_id, total_messages)
        VALUES (NEW.session_id, 1)
        ON CONFLICT (session_id) 
        DO UPDATE SET
            total_messages = session_quality_metrics.total_messages + 1,
            positive_feedback = CASE 
                WHEN NEW.feedback->>'rating' IN ('helpful', 'positive') 
                THEN session_quality_metrics.positive_feedback + 1 
                ELSE session_quality_metrics.positive_feedback 
            END,
            negative_feedback = CASE 
                WHEN NEW.feedback->>'rating' IN ('unhelpful', 'negative') 
                THEN session_quality_metrics.negative_feedback + 1 
                ELSE session_quality_metrics.negative_feedback 
            END,
            satisfaction_rate = CASE 
                WHEN session_quality_metrics.total_messages > 0 
                THEN (session_quality_metrics.positive_feedback::NUMERIC / session_quality_metrics.total_messages) * 100
                ELSE 0 
            END,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metrics_on_feedback
AFTER INSERT OR UPDATE ON messages
FOR EACH ROW
WHEN (NEW.feedback IS NOT NULL)
EXECUTE FUNCTION update_session_metrics();

-- =====================================================
-- 5. SISTEMA DE GAPS DE CONHECIMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    confidence_score NUMERIC(3,2),
    category TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
    resolution_content TEXT,
    resolution_metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS knowledge_gap_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_id UUID REFERENCES knowledge_gaps(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    generated_by TEXT DEFAULT 'ai',
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_gap_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_id UUID REFERENCES knowledge_gaps(id) ON DELETE CASCADE,
    resolution_type TEXT NOT NULL,
    effectiveness_score NUMERIC(3,2),
    feedback_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para gaps
CREATE INDEX idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX idx_knowledge_gaps_severity ON knowledge_gaps(severity);
CREATE INDEX idx_knowledge_gaps_category ON knowledge_gaps(category);
CREATE INDEX idx_knowledge_gaps_confidence ON knowledge_gaps(confidence_score);
CREATE INDEX idx_gap_content_approved ON knowledge_gap_content(approved);
CREATE INDEX idx_gap_resolutions_effectiveness ON knowledge_gap_resolutions(effectiveness_score DESC);

-- =====================================================
-- 6. MÉTRICAS MULTI-LLM
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    query TEXT NOT NULL,
    response_time_ms INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_usd NUMERIC(10,6),
    quality_score NUMERIC(3,2),
    confidence_score NUMERIC(3,2),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    capabilities JSONB DEFAULT '{}',
    pricing JSONB DEFAULT '{}',
    performance_stats JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para métricas LLM
CREATE INDEX idx_llm_metrics_model ON llm_metrics(model_id);
CREATE INDEX idx_llm_metrics_created ON llm_metrics(created_at DESC);
CREATE INDEX idx_llm_metrics_quality ON llm_metrics(quality_score DESC);
CREATE INDEX idx_llm_metrics_cost ON llm_metrics(cost_usd);
CREATE INDEX idx_llm_registry_provider ON llm_model_registry(provider);
CREATE INDEX idx_llm_registry_active ON llm_model_registry(is_active);

-- =====================================================
-- 7. TABELAS DE REGIME URBANÍSTICO
-- =====================================================

CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    area_total_ha DECIMAL(10,2),
    populacao INTEGER,
    densidade_hab_ha DECIMAL(10,2),
    domicilios INTEGER,
    quarteirao_padrao_m INTEGER,
    divisao_lote BOOLEAN,
    remembramento BOOLEAN,
    quota_ideal_m2 INTEGER,
    to_base DECIMAL(5,2),
    to_max DECIMAL(5,2),
    ca_max DECIMAL(5,2),
    altura_max_m DECIMAL(10,2),
    taxa_permeabilidade DECIMAL(5,2),
    recuo_jardim_m DECIMAL(10,2),
    recuo_lateral_m DECIMAL(10,2),
    recuo_fundos_m DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    caracteristicas JSONB DEFAULT '{}',
    restricoes JSONB DEFAULT '{}',
    incentivos JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para regime urbanístico
CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);
CREATE INDEX idx_regime_altura ON regime_urbanistico(altura_max_m);
CREATE INDEX idx_regime_metadata ON regime_urbanistico USING gin(metadata);

CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_caracteristicas ON zots_bairros USING gin(caracteristicas);

-- =====================================================
-- RLS (Row Level Security) - APLICAR APÓS CRIAÇÃO
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_hierarchical_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gap_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gap_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE zots_bairros ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "Enable read for all users" ON regime_urbanistico FOR SELECT USING (true);
CREATE POLICY "Enable read for all users" ON zots_bairros FOR SELECT USING (true);

-- =====================================================
-- FUNÇÕES DE MANUTENÇÃO
-- =====================================================

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at
CREATE TRIGGER update_regime_urbanistico_updated_at BEFORE UPDATE ON regime_urbanistico
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_zots_bairros_updated_at BEFORE UPDATE ON zots_bairros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Query para verificar todas as tabelas criadas
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'query_cache',
    'match_hierarchical_cache',
    'feedback_alerts',
    'session_quality_metrics',
    'model_performance_metrics',
    'knowledge_gaps',
    'knowledge_gap_content',
    'knowledge_gap_resolutions',
    'llm_metrics',
    'llm_model_registry',
    'regime_urbanistico',
    'zots_bairros'
)
ORDER BY table_name;

-- =====================================================
-- FIM DAS MIGRAÇÕES
-- =====================================================