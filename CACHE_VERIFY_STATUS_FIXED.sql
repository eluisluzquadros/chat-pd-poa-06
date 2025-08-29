-- ============================================================
-- VERIFICAÇÃO COMPLETA DO STATUS DO CACHE (CORRIGIDA)
-- Execute após completar todos os passos
-- ============================================================

-- 1. VERIFICAR SE TABELA EXISTE
-- ============================================================
SELECT 
  'query_cache table' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_cache')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. VERIFICAR ÍNDICES CRIADOS
-- ============================================================
SELECT 
  'Índices criados' as component,
  COUNT(*) || ' índices' as status
FROM pg_indexes
WHERE tablename IN ('query_cache', 'regime_urbanistico', 'document_sections')
  AND schemaname = 'public';

-- Listar índices específicos
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('query_cache', 'regime_urbanistico', 'document_sections')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. VERIFICAR FUNÇÕES CRIADAS
-- ============================================================
SELECT 
  'Funções disponíveis' as component,
  string_agg(proname, ', ') as functions
FROM pg_proc
WHERE proname IN (
  'fast_regime_lookup_simple',
  'cache_regime_query',
  'add_to_cache',
  'get_from_cache',
  'clean_expired_cache'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. VERIFICAR CACHE PRE-AQUECIDO
-- ============================================================
SELECT 
  'Total Cache Entries' as metric,
  COUNT(*) as value,
  COUNT(DISTINCT query_type) as types
FROM query_cache;

-- Detalhamento por tipo
SELECT 
  query_type,
  COUNT(*) as entries,
  AVG(hit_count) as avg_hits,
  MAX(hit_count) as max_hits
FROM query_cache
GROUP BY query_type
ORDER BY entries DESC;

-- 5. ESTATÍSTICAS DO CACHE
-- ============================================================
SELECT * FROM cache_statistics;

-- 6. QUERIES MAIS ACESSADAS
-- ============================================================
SELECT 
  ROW_NUMBER() OVER (ORDER BY hit_count DESC) as rank,
  SUBSTRING(query_text, 1, 40) as query,
  query_type,
  hit_count,
  DATE_TRUNC('minute', created_at) as cached_at
FROM query_cache
WHERE hit_count > 0
ORDER BY hit_count DESC
LIMIT 10;

-- 7. TESTAR FUNÇÕES DE BUSCA
-- ============================================================

-- Teste 1: Busca simples
WITH test1 AS (
  SELECT COUNT(*) as count 
  FROM fast_regime_lookup_simple('CENTRO', NULL)
)
SELECT 
  'fast_regime_lookup_simple' as function_name,
  CASE 
    WHEN count > 0 THEN '✅ WORKING (' || count || ' results)'
    ELSE '❌ NO RESULTS'
  END as status
FROM test1;

-- Teste 2: Busca com cache
WITH test2 AS (
  SELECT cache_regime_query('CENTRO HISTÓRICO', NULL) as result
)
SELECT 
  'cache_regime_query' as function_name,
  CASE 
    WHEN result IS NOT NULL THEN '✅ WORKING'
    ELSE '❌ NULL RESULT'
  END as status
FROM test2;

-- Teste 3: Adicionar ao cache
DO $$
BEGIN
  PERFORM add_to_cache('test_query_' || NOW()::text, 'test', '{"test": true}'::JSONB);
END $$;

SELECT 
  'add_to_cache' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM query_cache WHERE query_type = 'test')
    THEN '✅ WORKING'
    ELSE '❌ NOT WORKING'
  END as status;

-- 8. PERFORMANCE DO CACHE
-- ============================================================
WITH cache_performance AS (
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE hit_count > 1) as hits,
    AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_time,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
  FROM query_cache
)
SELECT 
  'Cache Performance' as metric,
  total || ' entries' as entries,
  CASE 
    WHEN total > 0 
    THEN ROUND((hits::numeric / total) * 100, 2) || '%'
    ELSE '0%'
  END as hit_rate,
  COALESCE(ROUND(avg_time, 2)::text, 'N/A') || 'ms' as avg_response_time,
  AGE(NOW(), oldest_entry)::text as cache_age
FROM cache_performance;

-- 9. TAMANHO DO CACHE
-- ============================================================
SELECT 
  'Cache Storage' as metric,
  pg_size_pretty(pg_total_relation_size('query_cache')) as table_size,
  pg_size_pretty(pg_total_relation_size('idx_cache_hash')) as index_size,
  COUNT(*) as total_entries,
  pg_size_pretty(AVG(LENGTH(result::text))::bigint) as avg_entry_size
FROM query_cache;

-- 10. QUERIES Q&A EM CACHE
-- ============================================================
SELECT 
  'Q&A Queries Cached' as category,
  COUNT(*) as count,
  array_agg(SUBSTRING(query_text, 1, 30) ORDER BY query_text) as examples
FROM query_cache
WHERE query_type = 'qa';

-- 11. QUERIES DE REGIME EM CACHE
-- ============================================================
SELECT 
  'Regime Queries Cached' as category,
  COUNT(*) as count,
  array_agg(DISTINCT 
    CASE 
      WHEN query_text LIKE '%CENTRO%' THEN 'Centro'
      WHEN query_text LIKE '%RESTINGA%' THEN 'Restinga'
      WHEN query_text LIKE '%MOINHOS%' THEN 'Moinhos'
      WHEN query_text LIKE '%ZOT%' THEN 'Zonas'
      ELSE 'Outros'
    END
  ) as areas
FROM query_cache
WHERE query_type = 'regime' OR query_text LIKE 'regime:%';

-- 12. VERIFICAR EXPIRAÇÃO
-- ============================================================
SELECT 
  'Cache Expiration Status' as metric,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
  COUNT(*) FILTER (WHERE expires_at > NOW() + INTERVAL '7 days') as long_term,
  MIN(expires_at) as next_expiration
FROM query_cache;

-- 13. RESUMO FINAL DO STATUS
-- ============================================================
WITH summary AS (
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_cache') as table_exists,
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cache_regime_query') as functions_exist,
    (SELECT COUNT(*) FROM query_cache) as cache_entries,
    (SELECT COUNT(*) FROM query_cache WHERE query_type = 'qa') as qa_entries,
    (SELECT COUNT(*) FROM query_cache WHERE query_type = 'regime' OR query_text LIKE 'regime:%') as regime_entries
)
SELECT 
  CASE
    WHEN NOT table_exists THEN '❌ CACHE NOT INSTALLED'
    WHEN NOT functions_exist THEN '⚠️ FUNCTIONS MISSING'
    WHEN cache_entries = 0 THEN '⚠️ CACHE EMPTY - Run PREWARM script'
    WHEN cache_entries < 10 THEN '🟡 CACHE PARTIALLY LOADED (' || cache_entries || ' entries)'
    ELSE '✅ CACHE FULLY OPERATIONAL (' || cache_entries || ' entries: ' || 
         qa_entries || ' Q&A, ' || regime_entries || ' regime)'
  END as "🎯 CACHE SYSTEM STATUS"
FROM summary;

-- ============================================================
-- FIM DA VERIFICAÇÃO
-- Se tudo estiver ✅, o cache está pronto para uso!
-- ============================================================