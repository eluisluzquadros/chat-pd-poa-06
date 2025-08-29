-- ============================================================
-- PASSO 3: FUNÇÕES OTIMIZADAS (VERSÃO SIMPLIFICADA)
-- Execute após criar índices
-- ============================================================

-- Limpar funções existentes
DROP FUNCTION IF EXISTS fast_regime_lookup(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS clean_expired_cache();
DROP VIEW IF EXISTS cache_statistics;

-- 1. FUNÇÃO SIMPLIFICADA PARA BUSCA DE REGIME
-- ============================================================

CREATE OR REPLACE FUNCTION fast_regime_lookup_simple(
  p_bairro TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL
)
RETURNS SETOF regime_urbanistico
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM regime_urbanistico r
  WHERE 
    (p_bairro IS NULL OR r.bairro ILIKE '%' || p_bairro || '%')
    AND (p_zona IS NULL OR r.zona ILIKE '%' || p_zona || '%')
  LIMIT 100;
END;
$$;

-- 2. FUNÇÃO PARA ADICIONAR AO CACHE
-- ============================================================

CREATE OR REPLACE FUNCTION add_to_cache(
  p_query_text TEXT,
  p_query_type TEXT,
  p_result JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_hash VARCHAR(64);
BEGIN
  v_query_hash := MD5(p_query_text);
  
  INSERT INTO query_cache (
    query_hash,
    query_text,
    query_type,
    result,
    expires_at
  )
  VALUES (
    v_query_hash,
    p_query_text,
    p_query_type,
    p_result,
    CURRENT_TIMESTAMP + INTERVAL '7 days'
  )
  ON CONFLICT (query_hash) 
  DO UPDATE SET
    result = EXCLUDED.result,
    hit_count = query_cache.hit_count + 1,
    last_hit = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days';
END;
$$;

-- 3. FUNÇÃO PARA BUSCAR DO CACHE
-- ============================================================

CREATE OR REPLACE FUNCTION get_from_cache(
  p_query_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_hash VARCHAR(64);
  v_result JSONB;
BEGIN
  v_query_hash := MD5(p_query_text);
  
  SELECT result INTO v_result
  FROM query_cache
  WHERE query_hash = v_query_hash
    AND expires_at > CURRENT_TIMESTAMP;
  
  IF v_result IS NOT NULL THEN
    -- Atualizar hit count
    UPDATE query_cache 
    SET hit_count = hit_count + 1,
        last_hit = CURRENT_TIMESTAMP
    WHERE query_hash = v_query_hash;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 4. FUNÇÃO PARA LIMPAR CACHE EXPIRADO
-- ============================================================

CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM query_cache
  WHERE expires_at < CURRENT_TIMESTAMP
  OR (hit_count = 1 AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- 5. VIEW DE ESTATÍSTICAS
-- ============================================================

CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE hit_count > 1) AS cached_hits,
  COALESCE(AVG(hit_count), 0) AS avg_hits,
  COALESCE(MAX(hit_count), 0) AS max_hits,
  COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) AS active_entries,
  COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) AS expired_entries,
  COALESCE(AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL), 0) AS avg_response_time,
  COUNT(DISTINCT query_type) AS query_types
FROM query_cache;

-- 6. FUNÇÃO HELPER PARA CACHE DE REGIME
-- ============================================================

CREATE OR REPLACE FUNCTION cache_regime_query(
  p_bairro TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_text TEXT;
  v_cached JSONB;
  v_result JSON;
BEGIN
  -- Criar texto da query
  v_query_text := CONCAT(
    'regime:',
    COALESCE(p_bairro, 'all'),
    ':',
    COALESCE(p_zona, 'all')
  );
  
  -- Verificar cache
  v_cached := get_from_cache(v_query_text);
  
  IF v_cached IS NOT NULL THEN
    RETURN v_cached::JSON;
  END IF;
  
  -- Buscar dados
  SELECT json_agg(row_to_json(r))
  INTO v_result
  FROM fast_regime_lookup_simple(p_bairro, p_zona) r;
  
  -- Adicionar ao cache
  IF v_result IS NOT NULL THEN
    PERFORM add_to_cache(v_query_text, 'regime', v_result::JSONB);
  END IF;
  
  RETURN v_result;
END;
$$;

-- 7. TESTAR FUNÇÕES
-- ============================================================

-- Teste básico
SELECT COUNT(*) as test_count FROM fast_regime_lookup_simple('CENTRO', NULL);

-- Teste com cache
SELECT cache_regime_query('CENTRO HISTÓRICO', NULL) AS cached_result;

-- Ver estatísticas
SELECT * FROM cache_statistics;