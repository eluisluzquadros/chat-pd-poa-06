-- URGENTE: Limpar cache de queries sobre bairros que estão retornando respostas antigas
-- Execute este SQL no Supabase Dashboard agora!

-- 1. Ver quantas queries estão em cache
SELECT COUNT(*) as total_cached_queries FROM query_cache;

-- 2. Ver queries problemáticas específicas
SELECT 
    query,
    substring(response, 1, 100) as response_preview,
    confidence,
    hit_count,
    created_at
FROM query_cache
WHERE query ILIKE '%três figueiras%'
   OR query ILIKE '%tres figueiras%'
   OR query ILIKE '%petrópolis%'
   OR query ILIKE '%petropolis%'
   OR query ILIKE '%cristal%'
   OR (LENGTH(query) < 30 AND query NOT ILIKE '%quant%')
ORDER BY created_at DESC;

-- 3. LIMPAR queries problemáticas
DELETE FROM query_cache
WHERE query ILIKE '%três figueiras%'
   OR query ILIKE '%tres figueiras%'
   OR query ILIKE '%petrópolis%'
   OR query ILIKE '%petropolis%'
   OR query ILIKE '%cristal%'
   OR query ILIKE '%bairro%'
   OR query ILIKE '%zona%'
   OR query ILIKE '%zot%'
   OR query ILIKE '%regime%'
   OR query ILIKE '%urbanístico%'
   OR query ILIKE '%índice%'
   OR query ILIKE '%coeficiente%'
   OR query ILIKE '%altura%'
   OR query ILIKE '%construir%'
   OR query ILIKE '%potencial%'
   OR (LENGTH(query) < 30 AND query NOT ILIKE '%quant%');

-- 4. Verificar quantas queries restaram
SELECT COUNT(*) as remaining_queries FROM query_cache;

-- 5. Se preferir limpar TUDO (mais seguro)
-- TRUNCATE TABLE query_cache;