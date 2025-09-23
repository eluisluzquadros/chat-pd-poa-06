-- ============================================================
-- VERIFICAÇÃO DO STATUS DO CACHE
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

-- 3. VERIFICAR FUNÇÕES CRIADAS
-- ============================================================
SELECT 
  'Funções' as component,
  string_agg(proname, ', ') as status
FROM pg_proc
WHERE proname IN ('fast_regime_lookup', 'clean_expired_cache')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. VERIFICAR CACHE PRE-AQUECIDO
-- ============================================================
SELECT 
  'Cache entries' as component,
  COUNT(*) || ' queries cached' as status
FROM query_cache;

-- 5. ESTATÍSTICAS DO CACHE
-- ============================================================
SELECT * FROM cache_statistics;

-- 6. TOP 10 QUERIES EM CACHE
-- ============================================================
SELECT 
  SUBSTRING(query_text, 1, 50) as query,
  query_type,
  hit_count,
  response_time_ms,
  created_at
FROM query_cache
ORDER BY hit_count DESC, created_at DESC
LIMIT 10;

-- 7. TESTAR FUNÇÃO DE BUSCA
-- ============================================================
SELECT 
  'Teste fast_regime_lookup_simple' as test,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ WORKING (' || COUNT(*) || ' results)'
    ELSE '❌ NO RESULTS'
  END as result
FROM fast_regime_lookup_simple('CENTRO', NULL);

-- 8. PERFORMANCE DO CACHE
-- ============================================================
WITH cache_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE hit_count > 1) as hits,
    COUNT(*) as total,
    AVG(response_time_ms) as avg_time
  FROM query_cache
)
SELECT 
  'Cache Performance' as metric,
  CASE 
    WHEN total > 0 
    THEN ROUND((hits::numeric / total) * 100, 2) || '% hit rate, ' || 
         COALESCE(ROUND(avg_time, 2)::text, 'N/A') || 'ms avg'
    ELSE 'No cache data yet'
  END as value
FROM cache_stats;

-- 9. TAMANHO DO CACHE
-- ============================================================
SELECT 
  'Cache Size' as metric,
  pg_size_pretty(pg_total_relation_size('query_cache')) as size,
  COUNT(*) as entries,
  ROUND(AVG(LENGTH(result::text))) as avg_result_size
FROM query_cache;

-- 10. RESUMO FINAL
-- ============================================================
SELECT 
  '🎯 CACHE STATUS' as summary,
  CASE
    WHEN EXISTS (SELECT 1 FROM query_cache)
    THEN '✅ Cache system is ACTIVE with ' || 
         (SELECT COUNT(*) FROM query_cache) || ' entries'
    ELSE '⚠️ Cache is empty - run CACHE_STEP_4_PREWARM.sql'
  END as status;