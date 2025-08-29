-- ============================================================
-- CORRIGIR CONSTRAINT DO CACHE
-- Adicionar unique constraint em query_text
-- ============================================================

-- 1. Remover constraint antiga se existir
ALTER TABLE query_cache 
DROP CONSTRAINT IF EXISTS query_cache_query_hash_key;

-- 2. Adicionar índice único em query_text (normalizado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_query_text_unique 
ON query_cache(LOWER(TRIM(query_text)));

-- 3. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_cache_query_type 
ON query_cache(query_type);

CREATE INDEX IF NOT EXISTS idx_cache_expires 
ON query_cache(expires_at) 
WHERE expires_at > CURRENT_TIMESTAMP;

-- 4. Limpar duplicatas se existirem
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(query_text)) 
      ORDER BY hit_count DESC, created_at DESC
    ) as rn
  FROM query_cache
)
DELETE FROM query_cache 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 5. Verificar resultado
SELECT 
  COUNT(*) as total_entries,
  COUNT(DISTINCT LOWER(TRIM(query_text))) as unique_queries,
  MAX(hit_count) as max_hits,
  COUNT(*) FILTER (WHERE hit_count > 0) as queries_with_hits
FROM query_cache;

-- 6. Mostrar queries duplicadas removidas
SELECT 
  'Cache limpo e otimizado' as status,
  COUNT(*) as total_entries,
  COUNT(DISTINCT query_type) as query_types
FROM query_cache;