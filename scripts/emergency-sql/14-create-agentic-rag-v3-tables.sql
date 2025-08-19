-- ============================================================
-- TABELAS E FUNÇÕES PARA AGENTIC-RAG V3
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela de memória do chat
CREATE TABLE IF NOT EXISTS chat_memory (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_chat_memory_session 
ON chat_memory(session_id, timestamp DESC);

-- 2. Criar função para busca de documentos com embedding
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    document_type VARCHAR,
    article_number INTEGER,
    title TEXT,
    full_content TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.document_type,
        la.article_number,
        la.title,
        la.full_content,
        1 - (la.embedding <=> query_embedding) as similarity
    FROM legal_articles la
    WHERE la.embedding IS NOT NULL
        AND 1 - (la.embedding <=> query_embedding) > match_threshold
    ORDER BY la.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3. Criar função para executar SQL dinâmico (com segurança)
CREATE OR REPLACE FUNCTION execute_dynamic_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Validações de segurança
    IF sql_query ILIKE '%DROP%' OR 
       sql_query ILIKE '%DELETE%' OR 
       sql_query ILIKE '%TRUNCATE%' OR
       sql_query ILIKE '%INSERT%' OR
       sql_query ILIKE '%UPDATE%' OR
       sql_query ILIKE '%ALTER%' OR
       sql_query ILIKE '%CREATE%' THEN
        RAISE EXCEPTION 'Operação não permitida';
    END IF;
    
    -- Executar apenas SELECT
    IF sql_query ILIKE 'SELECT%' THEN
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
        INTO result;
    ELSE
        RAISE EXCEPTION 'Apenas consultas SELECT são permitidas';
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- 4. Criar função melhorada de busca híbrida
CREATE OR REPLACE FUNCTION hybrid_search(
    search_query TEXT,
    embedding_vector vector(1536) DEFAULT NULL,
    doc_type VARCHAR DEFAULT NULL,
    limit_results INT DEFAULT 10
)
RETURNS TABLE (
    source VARCHAR,
    document_type VARCHAR,
    article_number INTEGER,
    title TEXT,
    content TEXT,
    hierarchy TEXT,
    relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Busca por embedding
    vector_results AS (
        SELECT 
            'vector' as source,
            la.document_type,
            la.article_number,
            la.title,
            la.full_content as content,
            get_complete_hierarchy(la.document_type, la.article_number) as hierarchy,
            (1 - (la.embedding <=> embedding_vector)) as score
        FROM legal_articles la
        WHERE embedding_vector IS NOT NULL
            AND la.embedding IS NOT NULL
            AND (doc_type IS NULL OR la.document_type = doc_type)
        ORDER BY la.embedding <=> embedding_vector
        LIMIT limit_results
    ),
    -- Busca por texto
    text_results AS (
        SELECT 
            'text' as source,
            la.document_type,
            la.article_number,
            la.title,
            la.full_content as content,
            get_complete_hierarchy(la.document_type, la.article_number) as hierarchy,
            ts_rank(
                to_tsvector('portuguese', COALESCE(la.full_content, '') || ' ' || COALESCE(la.title, '')),
                plainto_tsquery('portuguese', search_query)
            ) as score
        FROM legal_articles la
        WHERE to_tsvector('portuguese', COALESCE(la.full_content, '') || ' ' || COALESCE(la.title, ''))
            @@ plainto_tsquery('portuguese', search_query)
            AND (doc_type IS NULL OR la.document_type = doc_type)
        ORDER BY score DESC
        LIMIT limit_results
    ),
    -- Combinar resultados
    combined AS (
        SELECT * FROM vector_results
        UNION ALL
        SELECT * FROM text_results
    )
    -- Retornar com scores normalizados
    SELECT DISTINCT ON (document_type, article_number)
        source,
        document_type,
        article_number,
        title,
        content,
        hierarchy,
        score as relevance_score
    FROM combined
    WHERE score > 0
    ORDER BY document_type, article_number, score DESC
    LIMIT limit_results;
END;
$$;

-- 5. Criar índices para busca textual
CREATE INDEX IF NOT EXISTS idx_legal_articles_fulltext 
ON legal_articles 
USING gin(to_tsvector('portuguese', COALESCE(full_content, '') || ' ' || COALESCE(title, '')));

-- 6. Popular alguns metadados de teste
INSERT INTO article_metadata (document_type, article_number, has_paragraphs, has_incisos, paragraph_count, inciso_count)
VALUES 
    ('LUOS', 119, true, true, 3, 2),
    ('LUOS', 4, true, false, 1, 0),
    ('LUOS', 77, true, false, 2, 0),
    ('PDUS', 1, true, true, 2, 4)
ON CONFLICT (document_type, article_number) DO NOTHING;

-- 7. Verificar instalação
SELECT 
    'chat_memory' as table_name,
    COUNT(*) as record_count
FROM chat_memory
UNION ALL
SELECT 
    'legal_hierarchy',
    COUNT(*)
FROM legal_hierarchy
UNION ALL
SELECT 
    'legal_articles',
    COUNT(*)
FROM legal_articles
UNION ALL
SELECT 
    'article_metadata',
    COUNT(*)
FROM article_metadata;

-- Mensagem de sucesso
SELECT '✅ Agentic-RAG v3 tables and functions created successfully!' as status;