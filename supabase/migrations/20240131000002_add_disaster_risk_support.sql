-- Adiciona suporte para dados de risco de desastre por bairro

-- Tabela para armazenar relação entre bairros e riscos de desastre
CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
  id SERIAL PRIMARY KEY,
  bairro_nome TEXT NOT NULL,
  bairro_nome_normalizado TEXT GENERATED ALWAYS AS (
    UPPER(UNACCENT(TRIM(bairro_nome)))
  ) STORED,
  
  -- Tipos de risco
  risco_inundacao BOOLEAN DEFAULT FALSE,
  risco_deslizamento BOOLEAN DEFAULT FALSE,
  risco_alagamento BOOLEAN DEFAULT FALSE,
  risco_vendaval BOOLEAN DEFAULT FALSE,
  risco_granizo BOOLEAN DEFAULT FALSE,
  
  -- Níveis de risco (1-5)
  nivel_risco_geral INTEGER CHECK (nivel_risco_geral BETWEEN 1 AND 5),
  nivel_risco_inundacao INTEGER CHECK (nivel_risco_inundacao BETWEEN 0 AND 5),
  nivel_risco_deslizamento INTEGER CHECK (nivel_risco_deslizamento BETWEEN 0 AND 5),
  
  -- Informações adicionais
  areas_criticas TEXT,
  observacoes TEXT,
  ultima_ocorrencia DATE,
  frequencia_anual INTEGER,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bairro_nome_normalizado)
);

-- Índices para busca otimizada
CREATE INDEX idx_bairros_risco_nome ON bairros_risco_desastre(bairro_nome_normalizado);
CREATE INDEX idx_bairros_risco_nivel ON bairros_risco_desastre(nivel_risco_geral);
CREATE INDEX idx_bairros_risco_tipos ON bairros_risco_desastre(
  risco_inundacao, 
  risco_deslizamento, 
  risco_alagamento
);

-- Função para buscar riscos por bairro
CREATE OR REPLACE FUNCTION get_riscos_bairro(nome_bairro TEXT)
RETURNS TABLE (
  bairro TEXT,
  riscos_ativos TEXT[],
  nivel_risco INTEGER,
  descricao_riscos TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    brd.bairro_nome,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN brd.risco_inundacao THEN 'Inundação' END,
      CASE WHEN brd.risco_deslizamento THEN 'Deslizamento' END,
      CASE WHEN brd.risco_alagamento THEN 'Alagamento' END,
      CASE WHEN brd.risco_vendaval THEN 'Vendaval' END,
      CASE WHEN brd.risco_granizo THEN 'Granizo' END
    ], NULL) as riscos_ativos,
    brd.nivel_risco_geral,
    CASE 
      WHEN brd.nivel_risco_geral = 5 THEN 'Risco Muito Alto'
      WHEN brd.nivel_risco_geral = 4 THEN 'Risco Alto'
      WHEN brd.nivel_risco_geral = 3 THEN 'Risco Médio'
      WHEN brd.nivel_risco_geral = 2 THEN 'Risco Baixo'
      WHEN brd.nivel_risco_geral = 1 THEN 'Risco Muito Baixo'
      ELSE 'Sem classificação'
    END as descricao_riscos
  FROM bairros_risco_desastre brd
  WHERE UPPER(UNACCENT(TRIM(brd.bairro_nome))) = UPPER(UNACCENT(TRIM(nome_bairro)))
     OR brd.bairro_nome ILIKE '%' || nome_bairro || '%';
END;
$$;

-- Função para buscar bairros por tipo de risco
CREATE OR REPLACE FUNCTION get_bairros_por_tipo_risco(
  tipo_risco TEXT,
  nivel_minimo INTEGER DEFAULT 3
)
RETURNS TABLE (
  bairro TEXT,
  nivel_risco INTEGER,
  areas_criticas TEXT,
  observacoes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    brd.bairro_nome,
    brd.nivel_risco_geral,
    brd.areas_criticas,
    brd.observacoes
  FROM bairros_risco_desastre brd
  WHERE brd.nivel_risco_geral >= nivel_minimo
    AND (
      (LOWER(tipo_risco) = 'inundacao' AND brd.risco_inundacao = TRUE) OR
      (LOWER(tipo_risco) = 'deslizamento' AND brd.risco_deslizamento = TRUE) OR
      (LOWER(tipo_risco) = 'alagamento' AND brd.risco_alagamento = TRUE) OR
      (LOWER(tipo_risco) = 'vendaval' AND brd.risco_vendaval = TRUE) OR
      (LOWER(tipo_risco) = 'granizo' AND brd.risco_granizo = TRUE) OR
      (LOWER(tipo_risco) = 'todos')
    )
  ORDER BY brd.nivel_risco_geral DESC, brd.bairro_nome;
END;
$$;

-- View materializada para performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bairros_alto_risco AS
SELECT 
  b.bairro_nome,
  b.nivel_risco_geral,
  b.riscos_ativos,
  b.areas_criticas,
  COUNT(DISTINCT z.zot_codigo) as total_zots,
  ARRAY_AGG(DISTINCT z.zot_codigo) as zots_afetadas
FROM (
  SELECT 
    bairro_nome,
    nivel_risco_geral,
    areas_criticas,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN risco_inundacao THEN 'Inundação' END,
      CASE WHEN risco_deslizamento THEN 'Deslizamento' END,
      CASE WHEN risco_alagamento THEN 'Alagamento' END,
      CASE WHEN risco_vendaval THEN 'Vendaval' END,
      CASE WHEN risco_granizo THEN 'Granizo' END
    ], NULL) as riscos_ativos
  FROM bairros_risco_desastre
  WHERE nivel_risco_geral >= 3
) b
LEFT JOIN zonas_bairros z ON UPPER(UNACCENT(b.bairro_nome)) = UPPER(UNACCENT(z.bairro_nome))
GROUP BY b.bairro_nome, b.nivel_risco_geral, b.riscos_ativos, b.areas_criticas;

-- Índice para a view materializada
CREATE INDEX idx_mv_bairros_alto_risco_nome ON mv_bairros_alto_risco(bairro_nome);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bairros_risco_desastre_updated_at
  BEFORE UPDATE ON bairros_risco_desastre
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários explicativos
COMMENT ON TABLE bairros_risco_desastre IS 'Tabela que relaciona bairros com seus respectivos riscos de desastre natural';
COMMENT ON COLUMN bairros_risco_desastre.nivel_risco_geral IS 'Nível geral de risco do bairro (1=Muito Baixo, 5=Muito Alto)';
COMMENT ON COLUMN bairros_risco_desastre.areas_criticas IS 'Descrição das áreas críticas dentro do bairro';
COMMENT ON FUNCTION get_riscos_bairro IS 'Retorna informações de risco de desastre para um bairro específico';
COMMENT ON FUNCTION get_bairros_por_tipo_risco IS 'Lista bairros afetados por um tipo específico de risco';
COMMENT ON MATERIALIZED VIEW mv_bairros_alto_risco IS 'View otimizada com bairros de alto risco e suas ZOTs afetadas';