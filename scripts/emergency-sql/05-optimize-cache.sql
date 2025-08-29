-- FASE 4.1: Otimizar e limpar cache
-- Execute este script para melhorar a performance

-- Limpar cache antigo (mais de 7 dias)
DELETE FROM query_cache 
WHERE created_at < NOW() - INTERVAL '7 days';

-- Verificar status do cache
SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT query_hash) as unique_queries,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) / 60 as avg_age_minutes,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
FROM query_cache;

-- Analisar queries mais comuns (para otimização)
SELECT 
    substring(query_text, 1, 50) || '...' as query_preview,
    COUNT(*) as hit_count,
    AVG(response_time_ms) as avg_response_time
FROM query_cache
GROUP BY query_text
ORDER BY hit_count DESC
LIMIT 10;

-- Criar índice para melhorar performance do cache (se não existir)
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_created ON query_cache(created_at DESC);

-- Vacuum para recuperar espaço
VACUUM ANALYZE query_cache;