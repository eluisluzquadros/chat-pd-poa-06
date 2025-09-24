-- URGENTE: Limpar cache de queries que está retornando respostas antigas e incorretas

-- 1. Ver o que está no cache
SELECT 
    query,
    substring(response, 1, 100) as response_preview,
    confidence,
    hit_count,
    created_at
FROM query_cache
WHERE query ILIKE '%cristal%'
   OR query ILIKE '%coeficiente%maior%4%'
   OR query ILIKE '%três figueiras%'
   OR query ILIKE '%zot 8%'
ORDER BY created_at DESC;

-- 2. LIMPAR TODO O CACHE (respostas antigas estão incorretas)
TRUNCATE TABLE query_cache;

-- 3. Alternativa: Limpar apenas queries problemáticas
DELETE FROM query_cache
WHERE query ILIKE '%cristal%'
   OR query ILIKE '%coeficiente%'
   OR query ILIKE '%três figueiras%'
   OR query ILIKE '%tres figueiras%'
   OR query ILIKE '%zot%'
   OR query ILIKE '%índice%'
   OR query ILIKE '%aproveitamento%'
   OR query ILIKE '%bairro%';

-- 4. Verificar se foi limpo
SELECT COUNT(*) as remaining_cached_queries FROM query_cache;