-- Limpar cache de queries problemáticas
DELETE FROM query_cache
WHERE query ILIKE '%três figueiras%'
   OR query ILIKE '%tres figueiras%'
   OR query ILIKE '%petrópolis%'
   OR query ILIKE '%cristal%'
   OR LENGTH(query) < 30;