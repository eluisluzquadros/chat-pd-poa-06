-- =====================================================
-- CRIAR TABELAS ESSENCIAIS - VERSÃO SIMPLIFICADA
-- Execute este script PRIMEIRO para criar as tabelas mínimas necessárias
-- =====================================================

-- 1. Criar tabela documents
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

-- 2. Criar tabela document_chunks
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela document_rows (para Excel)
CREATE TABLE IF NOT EXISTS document_rows (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela regime_urbanistico
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

-- 5. Criar tabela query_cache
CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    query_hash TEXT,
    response TEXT NOT NULL,
    response_time_ms INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 6. Criar tabela sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 7. Criar tabela messages
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

-- 8. Criar tabela user_queries
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

-- 9. Criar tabela user_feedback
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

-- 10. Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

-- 11. Verificar criação
SELECT 
    table_name,
    'CREATED' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'documents', 
    'document_chunks', 
    'document_rows',
    'regime_urbanistico',
    'query_cache',
    'sessions',
    'messages',
    'user_queries',
    'user_feedback'
)
ORDER BY table_name;