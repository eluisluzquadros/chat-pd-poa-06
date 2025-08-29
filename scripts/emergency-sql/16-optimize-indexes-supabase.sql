-- ===================================
-- FASE 3 - OTIMIZAÇÃO DE ÍNDICES (VERSÃO SUPABASE)
-- Removido CONCURRENTLY para execução no Dashboard
-- Performance: < 3s de resposta
-- ===================================

-- 1. ÍNDICE HNSW OTIMIZADO PARA BUSCA VETORIAL
-- Drop existing vector index if it exists
DO $$
BEGIN
    DROP INDEX IF EXISTS idx_document_sections_embedding_hnsw;
    DROP INDEX IF EXISTS idx_document_sections_embedding_vector;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create optimized HNSW index for vector search
-- m=16: good balance between accuracy and memory
-- ef_construction=64: good build time vs quality
CREATE INDEX IF NOT EXISTS idx_document_sections_embedding_hnsw 
ON document_sections 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. ÍNDICES PARA BUSCA HÍBRIDA (Texto + Vetor)
-- Full-text search index optimized for Portuguese
DROP INDEX IF EXISTS idx_document_sections_content_fts;
CREATE INDEX IF NOT EXISTS idx_document_sections_content_fts 
ON document_sections 
USING gin(to_tsvector('portuguese', content));

-- Keywords search index
DROP INDEX IF EXISTS idx_document_sections_keywords_gin;
CREATE INDEX IF NOT EXISTS idx_document_sections_keywords_gin 
ON document_sections 
USING gin(keywords);

-- 3. ÍNDICES COMPOSTOS PARA PERFORMANCE
-- Composite index for filtered vector search
DROP INDEX IF EXISTS idx_document_sections_source_embedding;
CREATE INDEX IF NOT EXISTS idx_document_sections_source_embedding 
ON document_sections (source_document, embedding);

-- Composite index for hierarchical search
DROP INDEX IF EXISTS idx_document_sections_hierarchy_composite;
CREATE INDEX IF NOT EXISTS idx_document_sections_hierarchy_composite 
ON document_sections (source_document, section_type, parent_section_id);

-- 4. ÍNDICES ESPECÍFICOS PARA REGIME URBANÍSTICO
-- ZOT search optimization (usando a tabela correta)
DROP INDEX IF EXISTS idx_regime_urbanistico_zot_bairro;
CREATE INDEX IF NOT EXISTS idx_regime_urbanistico_zot_bairro 
ON regime_urbanistico_consolidado ("Zona", "Bairro");

-- Height search optimization  
DROP INDEX IF EXISTS idx_regime_urbanistico_altura;
CREATE INDEX IF NOT EXISTS idx_regime_urbanistico_altura 
ON regime_urbanistico_consolidado ("Altura_Maxima___Edificacao_Isolada") 
WHERE "Altura_Maxima___Edificacao_Isolada" IS NOT NULL;

-- Multi-column search for urban parameters
DROP INDEX IF EXISTS idx_regime_urbanistico_composite;
CREATE INDEX IF NOT EXISTS idx_regime_urbanistico_composite 
ON regime_urbanistico_consolidado ("Zona", "Bairro", "Altura_Maxima___Edificacao_Isolada");

-- 5. ÍNDICES PARA CACHE E PERFORMANCE
-- Query cache optimization
DROP INDEX IF EXISTS idx_query_cache_query_hash;
CREATE INDEX IF NOT EXISTS idx_query_cache_query_hash 
ON query_cache (query_hash);

-- Cache TTL index for cleanup
DROP INDEX IF EXISTS idx_query_cache_created_at;
CREATE INDEX IF NOT EXISTS idx_query_cache_created_at 
ON query_cache (created_at);

-- 6. ÍNDICES PARA QA E MÉTRICAS
-- QA test cases optimization
DROP INDEX IF EXISTS idx_qa_test_cases_category;
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_category 
ON qa_test_cases (category);

-- LLM metrics optimization
DROP INDEX IF EXISTS idx_llm_metrics_model_timestamp;
CREATE INDEX IF NOT EXISTS idx_llm_metrics_model_timestamp 
ON llm_metrics (model_name, created_at DESC);

-- 7. ÍNDICES PARA LEGAL_ARTICLES
-- Article number search
DROP INDEX IF EXISTS idx_legal_articles_number;
CREATE INDEX IF NOT EXISTS idx_legal_articles_number 
ON legal_articles (article_number, document_type);

-- Full text search on articles
DROP INDEX IF EXISTS idx_legal_articles_text_fts;
CREATE INDEX IF NOT EXISTS idx_legal_articles_text_fts 
ON legal_articles 
USING gin(to_tsvector('portuguese', COALESCE(article_text, '') || ' ' || COALESCE(full_content, '')));

-- Keywords index
DROP INDEX IF EXISTS idx_legal_articles_keywords;
CREATE INDEX IF NOT EXISTS idx_legal_articles_keywords 
ON legal_articles 
USING gin(keywords);

-- 8. ESTATÍSTICAS E MANUTENÇÃO
-- Update table statistics for query planner
ANALYZE document_sections;
ANALYZE regime_urbanistico_consolidado;
ANALYZE query_cache;
ANALYZE qa_test_cases;
ANALYZE llm_metrics;
ANALYZE legal_articles;

-- 9. CONFIGURAÇÕES DE PERFORMANCE PARA BUSCA VETORIAL
-- Set work_mem for better vector operations (session level)
-- This should be configured at database level for production
SET work_mem = '256MB';

-- 10. FUNÇÃO PARA VERIFICAR PERFORMANCE DOS ÍNDICES
CREATE OR REPLACE FUNCTION check_index_performance()
RETURNS TABLE (
    index_name text,
    table_name text,
    index_size text,
    usage_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexrelname::text as index_name,
        t.relname::text as table_name,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        s.idx_scan as usage_count
    FROM pg_stat_user_indexes s
    JOIN pg_class i ON i.oid = s.indexrelid
    JOIN pg_class t ON t.oid = s.relid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNÇÃO PARA MONITORAR QUERIES LENTAS
CREATE OR REPLACE FUNCTION check_slow_queries()
RETURNS TABLE (
    query_text text,
    mean_time numeric,
    calls bigint,
    total_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        substr(pg_stat_statements.query, 1, 100) as query_text,
        pg_stat_statements.mean_time,
        pg_stat_statements.calls,
        pg_stat_statements.total_time
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_time > 1000 -- queries > 1s
    ORDER BY pg_stat_statements.mean_time DESC
    LIMIT 10;
EXCEPTION
    WHEN undefined_table THEN
        -- pg_stat_statements extension not available
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- VALIDAÇÃO DOS ÍNDICES CRIADOS
-- ===================================

-- Verificar se todos os índices foram criados
DO $$
DECLARE
    missing_indexes text[];
    expected_indexes text[] := ARRAY[
        'idx_document_sections_embedding_hnsw',
        'idx_document_sections_content_fts', 
        'idx_document_sections_keywords_gin',
        'idx_document_sections_source_embedding',
        'idx_document_sections_hierarchy_composite',
        'idx_regime_urbanistico_zot_bairro',
        'idx_regime_urbanistico_altura',
        'idx_regime_urbanistico_composite',
        'idx_query_cache_query_hash',
        'idx_query_cache_created_at',
        'idx_qa_test_cases_category',
        'idx_llm_metrics_model_timestamp',
        'idx_legal_articles_number',
        'idx_legal_articles_text_fts',
        'idx_legal_articles_keywords'
    ];
    idx text;
BEGIN
    FOREACH idx IN ARRAY expected_indexes
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE NOTICE 'ATENÇÃO: Índices não criados: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ Todos os índices foram criados com sucesso!';
    END IF;
END $$;

-- Verificar estatísticas básicas
SELECT 
    '📊 Estatísticas do Sistema' as info,
    (SELECT COUNT(*) FROM legal_articles) as total_articles,
    (SELECT COUNT(*) FROM document_sections) as total_sections,
    (SELECT COUNT(*) FROM regime_urbanistico_consolidado) as total_regime,
    (SELECT COUNT(*) FROM query_cache) as cached_queries;

-- ===================================
-- MENSAGEM FINAL
-- ===================================
SELECT '✅ Script de otimização de índices executado com sucesso!' as status,
       'Execute o script 17-monitoring-tables.sql em seguida' as next_step;