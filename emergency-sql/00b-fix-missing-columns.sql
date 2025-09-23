-- =====================================================
-- FIX: Adicionar colunas faltantes nas tabelas
-- Execute este script SE receber erros de colunas não existentes
-- =====================================================

-- 1. Verificar estrutura atual da tabela documents
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- 2. Adicionar colunas faltantes na tabela documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_type TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_size INTEGER;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Adicionar colunas faltantes em outras tabelas (se necessário)

-- Para document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Para document_embeddings
ALTER TABLE document_embeddings 
ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT '{}';

-- Para sessions
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Para messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS model TEXT;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS feedback JSONB;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Para user_queries
ALTER TABLE user_queries 
ADD COLUMN IF NOT EXISTS normalized_query TEXT;

ALTER TABLE user_queries 
ADD COLUMN IF NOT EXISTS intent TEXT;

ALTER TABLE user_queries 
ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '[]';

ALTER TABLE user_queries 
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);

-- Para query_cache
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS query_hash TEXT;

ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Para user_feedback
ALTER TABLE user_feedback 
ADD COLUMN IF NOT EXISTS categories TEXT[];

ALTER TABLE user_feedback 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Para regime_urbanistico (adicionar colunas completas se necessário)
ALTER TABLE regime_urbanistico 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 4. Re-criar índices importantes (caso tenham sido perdidos)
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- 5. Verificar se todas as colunas foram adicionadas
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('documents', 'document_chunks', 'sessions', 'messages', 'user_queries', 'query_cache')
GROUP BY table_name
ORDER BY table_name;

-- Resultado esperado:
-- documents: pelo menos 9 colunas
-- document_chunks: pelo menos 6 colunas
-- sessions: pelo menos 5 colunas
-- messages: pelo menos 9 colunas
-- user_queries: pelo menos 8 colunas
-- query_cache: pelo menos 8 colunas