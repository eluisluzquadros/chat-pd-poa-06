-- ============================================================
-- PASSO 2: CRIAR ÍNDICES OTIMIZADOS
-- Execute após criar a tabela query_cache
-- ============================================================

-- 1. ÍNDICES PARA REGIME_URBANISTICO
-- ============================================================

-- Índice composto para buscas mais comuns
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona 
  ON regime_urbanistico(bairro, zona);

-- Índice para altura
CREATE INDEX IF NOT EXISTS idx_regime_altura 
  ON regime_urbanistico(altura_maxima);

-- Índice para coeficientes
CREATE INDEX IF NOT EXISTS idx_regime_coef_basico 
  ON regime_urbanistico(coef_aproveitamento_basico);

CREATE INDEX IF NOT EXISTS idx_regime_coef_maximo 
  ON regime_urbanistico(coef_aproveitamento_maximo);

-- 2. ÍNDICES PARA DOCUMENT_SECTIONS
-- ============================================================

-- Verificar se extensão existe
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para metadados JSON
CREATE INDEX IF NOT EXISTS idx_docs_metadata 
  ON document_sections 
  USING gin(metadata);

-- Índice para tipo de documento
CREATE INDEX IF NOT EXISTS idx_docs_source 
  ON document_sections((metadata->>'source_file'));

-- Índice para busca textual (se não existir)
CREATE INDEX IF NOT EXISTS idx_docs_content_trgm 
  ON document_sections 
  USING gin(content gin_trgm_ops);

-- 3. ANALISAR TABELAS PARA OTIMIZAR
-- ============================================================

ANALYZE regime_urbanistico;
ANALYZE document_sections;
ANALYZE query_cache;

-- Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('regime_urbanistico', 'document_sections', 'query_cache')
ORDER BY tablename, indexname;