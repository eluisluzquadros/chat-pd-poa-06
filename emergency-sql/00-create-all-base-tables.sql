-- =====================================================
-- CRIAR TODAS AS TABELAS BASE - CHAT PD POA
-- Execute este script PRIMEIRO no Supabase SQL Editor
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================
-- 1. TABELA DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    chunk_count INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- =====================================================
-- 2. TABELA DE CHUNKS DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chunks_content ON document_chunks USING gin(content gin_trgm_ops);

-- =====================================================
-- 3. TABELA DE EMBEDDINGS (compatibilidade)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_embeddings (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding vector(1536),
    chunk_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON document_embeddings USING gin(content_chunk gin_trgm_ops);

-- =====================================================
-- 4. TABELA DE LINHAS DE DOCUMENTOS (para Excel)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_rows (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, row_index)
);

CREATE INDEX IF NOT EXISTS idx_rows_document_id ON document_rows(document_id);
CREATE INDEX IF NOT EXISTS idx_rows_data ON document_rows USING gin(row_data);

-- =====================================================
-- 5. TABELA DE SESSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);

-- =====================================================
-- 6. TABELA DE MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- =====================================================
-- 7. TABELA DE QUERIES DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS user_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    normalized_query TEXT,
    intent TEXT,
    entities JSONB DEFAULT '[]',
    confidence_score NUMERIC(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queries_session ON user_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_queries_intent ON user_queries(intent);
CREATE INDEX IF NOT EXISTS idx_queries_created ON user_queries(created_at DESC);

-- =====================================================
-- 8. TABELA DE CACHE DE QUERIES
-- =====================================================
CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    response TEXT NOT NULL,
    response_time_ms INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_created ON query_cache(created_at DESC);

-- =====================================================
-- 9. TABELA DE FEEDBACK DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    rating TEXT CHECK (rating IN ('helpful', 'unhelpful', 'neutral')),
    comment TEXT,
    categories TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_feedback_message ON user_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON user_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON user_feedback(rating);

-- =====================================================
-- 10. TABELA DE CONFIGURAÇÕES LLM
-- =====================================================
CREATE TABLE IF NOT EXISTS llm_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    max_tokens INTEGER DEFAULT 4000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_active_priority ON llm_configs(active, priority) WHERE active = true;

-- =====================================================
-- 11. TABELA DE REGIME URBANÍSTICO
-- =====================================================
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    altura_maxima_isolada TEXT,
    coeficiente_aproveitamento_basico TEXT,
    coeficiente_aproveitamento_maximo TEXT,
    area_minima_lote TEXT,
    testada_minima_lote TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);

-- =====================================================
-- 12. FUNÇÃO DE BUSCA VETORIAL
-- =====================================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    document_id bigint,
    content text,
    similarity float
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_regime_updated_at BEFORE UPDATE ON regime_urbanistico
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "Enable read access for all users" ON documents
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON document_chunks
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON document_embeddings
    FOR SELECT USING (true);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute esta query para verificar se todas as tabelas foram criadas:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'documents', 'document_chunks', 'document_embeddings', 
    'document_rows', 'sessions', 'messages', 'user_queries',
    'query_cache', 'user_feedback', 'llm_configs', 
    'regime_urbanistico', 'secrets'
)
ORDER BY table_name;