-- ============================================================
-- PASSO 3: CRIAR FUNÇÕES OTIMIZADAS
-- Execute após criar índices
-- ============================================================

-- Limpar funções existentes se necessário
DROP FUNCTION IF EXISTS fast_regime_lookup(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS clean_expired_cache();

-- 1. FUNÇÃO PARA BUSCA RÁPIDA DE REGIME COM CACHE
-- ============================================================

CREATE OR REPLACE FUNCTION fast_regime_lookup(
  p_bairro TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL,
  p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id INTEGER,
  bairro VARCHAR(255),
  zona VARCHAR(255),
  altura_maxima VARCHAR(255),
  coef_aproveitamento_basico VARCHAR(255),
  coef_aproveitamento_maximo VARCHAR(255),
  area_minima_lote VARCHAR(255),
  cached BOOLEAN
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_hash VARCHAR(64);
  v_cached_result JSONB;
  v_start_time TIMESTAMP;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Gerar hash da query
  v_query_hash := MD5(COALESCE(p_bairro, '') || '|' || COALESCE(p_zona, ''));
  
  -- Verificar cache se habilitado
  IF p_use_cache THEN
    SELECT result INTO v_cached_result
    FROM query_cache
    WHERE query_hash = v_query_hash
      AND expires_at > CURRENT_TIMESTAMP
      AND query_type = 'regime';
    
    IF v_cached_result IS NOT NULL THEN
      -- Atualizar hit count
      UPDATE query_cache 
      SET hit_count = hit_count + 1,
          last_hit = CURRENT_TIMESTAMP
      WHERE query_hash = v_query_hash;
      
      -- Retornar resultado do cache
      RETURN QUERY
      SELECT 
        (r->>'id')::INTEGER,
        (r->>'bairro')::VARCHAR(255),
        (r->>'zona')::VARCHAR(255),
        (r->>'altura_maxima')::VARCHAR(255),
        (r->>'coef_aproveitamento_basico')::VARCHAR(255),
        (r->>'coef_aproveitamento_maximo')::VARCHAR(255),
        (r->>'area_minima_lote')::VARCHAR(255),
        TRUE AS cached
      FROM jsonb_array_elements(v_cached_result) AS r;
      
      RETURN;
    END IF;
  END IF;
  
  -- Busca otimizada
  RETURN QUERY
  WITH results AS (
    SELECT 
      r.id,
      r.bairro,
      r.zona,
      r.altura_maxima,
      r.coef_aproveitamento_basico,
      r.coef_aproveitamento_maximo,
      r.area_minima_lote,
      FALSE AS cached
    FROM regime_urbanistico r
    WHERE 
      (p_bairro IS NULL OR r.bairro ILIKE '%' || p_bairro || '%')
      AND (p_zona IS NULL OR r.zona ILIKE '%' || p_zona || '%')
    LIMIT 100
  )
  SELECT * FROM results;
  
  -- Salvar no cache se não estava lá
  IF p_use_cache THEN
    INSERT INTO query_cache (
      query_hash,
      query_text,
      query_type,
      result,
      response_time_ms,
      expires_at
    )
    SELECT
      v_query_hash,
      'Regime: ' || COALESCE(p_bairro, 'todos') || ' / ' || COALESCE(p_zona, 'todas'),
      'regime',
      jsonb_agg(row_to_json(results)),
      EXTRACT(MILLISECOND FROM clock_timestamp() - v_start_time)::INTEGER,
      CURRENT_TIMESTAMP + INTERVAL '7 days'
    FROM results
    ON CONFLICT (query_hash) 
    DO UPDATE SET
      result = EXCLUDED.result,
      updated_at = CURRENT_TIMESTAMP,
      expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days';
  END IF;
END;
$$;

-- 2. FUNÇÃO PARA LIMPAR CACHE EXPIRADO
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

-- 3. VIEW DE ESTATÍSTICAS DO CACHE
-- ============================================================

CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE hit_count > 1) AS cached_hits,
  AVG(hit_count) AS avg_hits,
  MAX(hit_count) AS max_hits,
  COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) AS active_entries,
  COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) AS expired_entries,
  AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) AS avg_response_time,
  COUNT(DISTINCT query_type) AS query_types
FROM query_cache;

-- Testar função
SELECT * FROM fast_regime_lookup('CENTRO', NULL, FALSE) LIMIT 5;