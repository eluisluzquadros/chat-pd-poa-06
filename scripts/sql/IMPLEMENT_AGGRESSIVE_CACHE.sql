-- ============================================================
-- IMPLEMENTAÇÃO DE CACHE AGRESSIVO E OTIMIZAÇÕES
-- Data: 08/08/2025
-- Objetivo: Reduzir tempo de resposta para < 2 segundos
-- ============================================================

-- 1. CRIAR TABELA DE CACHE APRIMORADA
-- ============================================================

DROP TABLE IF EXISTS query_cache CASCADE;

CREATE TABLE query_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50), -- 'regime', 'vector_search', 'sql', 'synthesis'
  result JSONB NOT NULL,
  response_time_ms INTEGER,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  hit_count INTEGER DEFAULT 1,
  last_hit TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days' -- TTL de 7 dias
);

-- Índices otimizados para cache
CREATE INDEX idx_cache_hash ON query_cache USING hash(query_hash);
CREATE INDEX idx_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_cache_hits ON query_cache(hit_count DESC);
CREATE INDEX idx_cache_type ON query_cache(query_type);
CREATE INDEX idx_cache_created ON query_cache(created_at DESC);

-- 2. OTIMIZAR ÍNDICES DA TABELA REGIME_URBANISTICO
-- ============================================================

-- Índice composto para buscas mais comuns
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona 
  ON regime_urbanistico(bairro, zona);

-- Índice para altura (queries frequentes)
CREATE INDEX IF NOT EXISTS idx_regime_altura 
  ON regime_urbanistico(altura_maxima) 
  WHERE altura_maxima IS NOT NULL;

-- Índice para coeficientes
CREATE INDEX IF NOT EXISTS idx_regime_coef_basico 
  ON regime_urbanistico(coef_aproveitamento_basico) 
  WHERE coef_aproveitamento_basico IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_regime_coef_maximo 
  ON regime_urbanistico(coef_aproveitamento_maximo) 
  WHERE coef_aproveitamento_maximo IS NOT NULL;

-- Índice para busca textual em bairro
CREATE INDEX IF NOT EXISTS idx_regime_bairro_trgm 
  ON regime_urbanistico 
  USING gin(bairro gin_trgm_ops);

-- 3. OTIMIZAR ÍNDICES DA TABELA DOCUMENT_SECTIONS
-- ============================================================

-- Índice GIN para metadados JSON
CREATE INDEX IF NOT EXISTS idx_docs_metadata 
  ON document_sections 
  USING gin(metadata);

-- Índice para tipo de documento
CREATE INDEX IF NOT EXISTS idx_docs_source 
  ON document_sections((metadata->>'source_file'));

-- Índice para busca textual com trigrams
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_docs_content_trgm 
  ON document_sections 
  USING gin(content gin_trgm_ops);

-- 4. FUNÇÃO PARA BUSCA RÁPIDA DE REGIME COM CACHE
-- ============================================================

CREATE OR REPLACE FUNCTION fast_regime_lookup(
  p_bairro TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL,
  p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id INTEGER,
  bairro TEXT,
  zona TEXT,
  altura_maxima TEXT,
  coef_aproveitamento_basico TEXT,
  coef_aproveitamento_maximo TEXT,
  area_minima_lote TEXT,
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
      AND expires_at > NOW()
      AND query_type = 'regime';
    
    IF v_cached_result IS NOT NULL THEN
      -- Atualizar hit count
      UPDATE query_cache 
      SET hit_count = hit_count + 1,
          last_hit = NOW()
      WHERE query_hash = v_query_hash;
      
      -- Retornar resultado do cache
      RETURN QUERY
      SELECT 
        (r->>'id')::INTEGER,
        r->>'bairro',
        r->>'zona',
        r->>'altura_maxima',
        r->>'coef_aproveitamento_basico',
        r->>'coef_aproveitamento_maximo',
        r->>'area_minima_lote',
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
      NOW() + INTERVAL '7 days'
    FROM results
    ON CONFLICT (query_hash) 
    DO UPDATE SET
      result = EXCLUDED.result,
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days';
  END IF;
END;
$$;

-- 5. FUNÇÃO PARA BUSCA VETORIAL COM CACHE
-- ============================================================

CREATE OR REPLACE FUNCTION cached_vector_search(
  p_query_embedding vector(1536),
  p_match_count INT DEFAULT 5,
  p_use_cache BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  cached BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_hash VARCHAR(64);
  v_cached_result JSONB;
BEGIN
  -- Gerar hash do embedding (primeiros elementos)
  v_query_hash := MD5(p_query_embedding::text);
  
  -- Verificar cache
  IF p_use_cache THEN
    SELECT result INTO v_cached_result
    FROM query_cache
    WHERE query_hash = v_query_hash
      AND expires_at > NOW()
      AND query_type = 'vector_search';
    
    IF v_cached_result IS NOT NULL THEN
      -- Atualizar hit count
      UPDATE query_cache 
      SET hit_count = hit_count + 1,
          last_hit = NOW()
      WHERE query_hash = v_query_hash;
      
      -- Retornar do cache
      RETURN QUERY
      SELECT 
        (r->>'id')::BIGINT,
        r->>'content',
        (r->>'metadata')::JSONB,
        (r->>'similarity')::FLOAT,
        TRUE AS cached
      FROM jsonb_array_elements(v_cached_result) AS r;
      
      RETURN;
    END IF;
  END IF;
  
  -- Busca vetorial otimizada
  RETURN QUERY
  WITH semantic_search AS (
    SELECT 
      ds.id,
      ds.content,
      ds.metadata,
      1 - (ds.embedding <=> p_query_embedding) AS similarity,
      FALSE AS cached
    FROM document_sections ds
    WHERE ds.embedding IS NOT NULL
    ORDER BY ds.embedding <=> p_query_embedding
    LIMIT p_match_count
  )
  SELECT * FROM semantic_search;
  
  -- Salvar no cache
  IF p_use_cache THEN
    INSERT INTO query_cache (
      query_hash,
      query_text,
      query_type,
      result,
      expires_at
    )
    SELECT
      v_query_hash,
      'Vector search',
      'vector_search',
      jsonb_agg(row_to_json(semantic_search)),
      NOW() + INTERVAL '30 days' -- Cache mais longo para embeddings
    FROM semantic_search
    ON CONFLICT (query_hash) DO NOTHING;
  END IF;
END;
$$;

-- 6. FUNÇÃO PARA LIMPAR CACHE EXPIRADO
-- ============================================================

CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM query_cache
  WHERE expires_at < NOW()
  OR (hit_count = 1 AND created_at < NOW() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Fazer VACUUM se muitas linhas foram deletadas
  IF v_deleted > 100 THEN
    -- VACUUM ANALYZE query_cache; -- Descomentar em produção
    NULL;
  END IF;
  
  RETURN v_deleted;
END;
$$;

-- 7. PRE-AQUECER CACHE COM QUERIES COMUNS
-- ============================================================

-- Inserir queries mais comuns diretamente no cache
INSERT INTO query_cache (query_hash, query_text, query_type, result, expires_at)
VALUES
  (
    MD5('altura maxima centro historico'),
    'Qual a altura máxima no Centro Histórico?',
    'regime',
    '[{"bairro": "CENTRO HISTÓRICO", "zona": "ZOT 08.1 - B", "altura_maxima": "75"}]'::JSONB,
    NOW() + INTERVAL '30 days'
  ),
  (
    MD5('o que sao zeis'),
    'O que são ZEIS?',
    'qa',
    '{"resposta": "ZEIS são Zonas Especiais de Interesse Social, áreas destinadas à produção e regularização de habitação de interesse social."}'::JSONB,
    NOW() + INTERVAL '30 days'
  ),
  (
    MD5('coeficiente aproveitamento basico'),
    'O que é coeficiente de aproveitamento básico?',
    'qa',
    '{"resposta": "É o índice que determina o potencial construtivo básico gratuito de um terreno, calculado multiplicando a área do terreno pelo coeficiente."}'::JSONB,
    NOW() + INTERVAL '30 days'
  )
ON CONFLICT (query_hash) DO NOTHING;

-- 8. ESTATÍSTICAS DO CACHE
-- ============================================================

CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE hit_count > 1) AS cached_hits,
  AVG(hit_count) AS avg_hits,
  MAX(hit_count) AS max_hits,
  COUNT(*) FILTER (WHERE expires_at > NOW()) AS active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired_entries,
  AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) AS avg_response_time,
  COUNT(DISTINCT query_type) AS query_types
FROM query_cache;

-- 9. CONFIGURAR AUTOVACUUM PARA TABELAS CRÍTICAS
-- ============================================================

ALTER TABLE query_cache SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE document_sections SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE regime_urbanistico SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- 10. ANALISAR TABELAS PARA OTIMIZAR PLANOS DE QUERY
-- ============================================================

ANALYZE regime_urbanistico;
ANALYZE document_sections;
ANALYZE query_cache;

-- ============================================================
-- FIM DA IMPLEMENTAÇÃO DE CACHE AGRESSIVO
-- 
-- Melhorias esperadas:
-- • Tempo de resposta: 5000ms → <2000ms
-- • Taxa de cache hit: 0% → 75%+
-- • Queries simultâneas: 10 → 50+
-- 
-- Para monitorar: SELECT * FROM cache_statistics;
-- ============================================================