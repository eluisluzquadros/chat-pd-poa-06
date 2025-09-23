-- ============================================================
-- TABELAS E FUNÇÕES PARA AGENTIC-RAG V3 (VERSÃO CORRIGIDA V3)
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

-- 2. Dropar função existente e recriar com nova assinatura
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    document_type TEXT,
    article_number INTEGER,
    article_text TEXT,
    full_content TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.document_type::TEXT,
        la.article_number,
        la.article_text,
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
DROP FUNCTION IF EXISTS execute_dynamic_sql(TEXT);

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
DROP FUNCTION IF EXISTS hybrid_search(TEXT, vector, VARCHAR, INT);

CREATE OR REPLACE FUNCTION hybrid_search(
    search_query TEXT,
    embedding_vector vector(1536) DEFAULT NULL,
    doc_type TEXT DEFAULT NULL,
    limit_results INT DEFAULT 10
)
RETURNS TABLE (
    source TEXT,
    document_type TEXT,
    article_number INTEGER,
    article_text TEXT,
    content TEXT,
    hierarchy TEXT,
    relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Busca por embedding (apenas se vector for fornecido)
    vector_results AS (
        SELECT 
            'vector'::TEXT as source,
            la.document_type::TEXT,
            la.article_number,
            la.article_text,
            COALESCE(la.full_content, la.article_text) as content,
            get_complete_hierarchy(la.document_type, la.article_number) as hierarchy,
            (1 - (la.embedding <=> embedding_vector))::FLOAT as score
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
            'text'::TEXT as source,
            la.document_type::TEXT,
            la.article_number,
            la.article_text,
            COALESCE(la.full_content, la.article_text) as content,
            get_complete_hierarchy(la.document_type, la.article_number) as hierarchy,
            ts_rank(
                to_tsvector('portuguese', COALESCE(la.full_content, '') || ' ' || COALESCE(la.article_text, '')),
                plainto_tsquery('portuguese', search_query)
            )::FLOAT as score
        FROM legal_articles la
        WHERE search_query IS NOT NULL 
            AND search_query != ''
            AND to_tsvector('portuguese', COALESCE(la.full_content, '') || ' ' || COALESCE(la.article_text, ''))
            @@ plainto_tsquery('portuguese', search_query)
            AND (doc_type IS NULL OR la.document_type = doc_type)
        ORDER BY score DESC
        LIMIT limit_results
    ),
    -- Combinar resultados
    combined AS (
        SELECT * FROM vector_results WHERE embedding_vector IS NOT NULL
        UNION ALL
        SELECT * FROM text_results WHERE search_query IS NOT NULL AND search_query != ''
    )
    -- Retornar com scores normalizados
    SELECT DISTINCT ON (cr.document_type, cr.article_number)
        cr.source,
        cr.document_type,
        cr.article_number,
        cr.article_text,
        cr.content,
        cr.hierarchy,
        cr.score as relevance_score
    FROM combined cr
    WHERE cr.score > 0
    ORDER BY cr.document_type, cr.article_number, cr.score DESC
    LIMIT limit_results;
END;
$$;

-- 5. Criar índices para busca textual (usando colunas corretas)
DROP INDEX IF EXISTS idx_legal_articles_fulltext;

CREATE INDEX idx_legal_articles_fulltext 
ON legal_articles 
USING gin(to_tsvector('portuguese', COALESCE(full_content, '') || ' ' || COALESCE(article_text, '')));

-- 6. Popular alguns metadados de teste
INSERT INTO article_metadata (document_type, article_number, has_paragraphs, has_incisos, paragraph_count, inciso_count)
VALUES 
    ('LUOS', 119, true, true, 3, 2),
    ('LUOS', 4, true, false, 1, 0),
    ('LUOS', 77, true, false, 2, 0),
    ('PDUS', 1, true, true, 2, 4)
ON CONFLICT (document_type, article_number) 
DO UPDATE SET 
    has_paragraphs = EXCLUDED.has_paragraphs,
    has_incisos = EXCLUDED.has_incisos,
    paragraph_count = EXCLUDED.paragraph_count,
    inciso_count = EXCLUDED.inciso_count;

-- 7. Criar função simples de busca de artigos (com tipos corretos)
DROP FUNCTION IF EXISTS search_articles_simple(TEXT, VARCHAR);
DROP FUNCTION IF EXISTS search_articles_simple(TEXT, TEXT);

CREATE OR REPLACE FUNCTION search_articles_simple(
    search_term TEXT,
    doc_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    document_type TEXT,
    article_number INTEGER,
    article_text TEXT,
    content TEXT,
    hierarchy TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.document_type::TEXT,
        la.article_number,
        la.article_text,
        COALESCE(la.full_content, la.article_text) as content,
        get_complete_hierarchy(la.document_type, la.article_number) as hierarchy
    FROM legal_articles la
    WHERE (
        -- Busca por número do artigo
        la.article_number::TEXT = search_term
        OR 
        -- Busca no texto do artigo
        LOWER(la.article_text) LIKE '%' || LOWER(search_term) || '%'
        OR
        -- Busca no conteúdo completo
        LOWER(COALESCE(la.full_content, '')) LIKE '%' || LOWER(search_term) || '%'
    )
    AND (doc_type IS NULL OR la.document_type::TEXT = doc_type)
    ORDER BY 
        CASE 
            WHEN la.article_number::TEXT = search_term THEN 1
            WHEN LOWER(la.article_text) LIKE '%' || LOWER(search_term) || '%' THEN 2
            ELSE 3
        END,
        la.article_number
    LIMIT 10;
END;
$$;

-- 8. Criar função para buscar ZOTs
DROP FUNCTION IF EXISTS search_zots(TEXT, TEXT);

CREATE OR REPLACE FUNCTION search_zots(
    zot_query TEXT DEFAULT NULL,
    bairro_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    zot TEXT,
    bairro TEXT,
    altura_max NUMERIC,
    ca_max NUMERIC,
    to_max NUMERIC,
    taxa_permeabilidade NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.zot::TEXT,
        r.bairro::TEXT,
        r.altura_max,
        r.ca_max,
        r.to_max,
        r.taxa_permeabilidade
    FROM regime_urbanistico_consolidado r
    WHERE (
        zot_query IS NULL 
        OR r.zot ILIKE '%' || zot_query || '%'
    )
    AND (
        bairro_query IS NULL 
        OR r.bairro ILIKE '%' || bairro_query || '%'
    )
    ORDER BY r.zot, r.bairro
    LIMIT 20;
END;
$$;

-- 9. Verificação simplificada
SELECT 
    'Tables' as component,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('chat_memory', 'legal_hierarchy', 'article_metadata')
UNION ALL
SELECT 
    'Functions',
    COUNT(*)
FROM pg_proc 
WHERE proname IN ('match_documents', 'hybrid_search', 'search_articles_simple', 'search_zots');

-- 10. Teste simples
DO $$
BEGIN
    -- Tentar executar uma busca simples
    PERFORM * FROM search_articles_simple('119', 'LUOS') LIMIT 1;
    RAISE NOTICE '✅ Função search_articles_simple funcionando';
    
    -- Tentar buscar ZOT
    PERFORM * FROM search_zots('8', NULL) LIMIT 1;
    RAISE NOTICE '✅ Função search_zots funcionando';
    
    RAISE NOTICE '=================================';
    RAISE NOTICE '✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '=================================';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro nos testes: %', SQLERRM;
END $$;

-- Mensagem final
SELECT 
    '✅ Agentic-RAG v3 configurado!' as status,
    'Próximo passo: Deploy da Edge Function' as action;