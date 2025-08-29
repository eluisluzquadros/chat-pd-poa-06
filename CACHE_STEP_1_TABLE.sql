-- ============================================================
-- PASSO 1: CRIAR TABELA DE CACHE
-- Execute este SQL primeiro no Supabase
-- ============================================================

-- Limpar se existir
DROP TABLE IF EXISTS query_cache CASCADE;

-- Criar tabela de cache otimizada
CREATE TABLE query_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  result JSONB NOT NULL,
  response_time_ms INTEGER,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  hit_count INTEGER DEFAULT 1,
  last_hit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Criar índices básicos
CREATE INDEX idx_cache_hash ON query_cache USING hash(query_hash);
CREATE INDEX idx_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_cache_hits ON query_cache(hit_count DESC);
CREATE INDEX idx_cache_type ON query_cache(query_type);
CREATE INDEX idx_cache_created ON query_cache(created_at DESC);

-- Verificar criação
SELECT 'Tabela query_cache criada com sucesso!' AS status;