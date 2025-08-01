-- Create a raw regime urbanistico table that can store all the original data as TEXT
-- This preserves all information from the document_rows dataset

-- First, let's create a comprehensive table with TEXT columns for all fields
CREATE TABLE IF NOT EXISTS regime_urbanistico_raw (
    id SERIAL PRIMARY KEY,
    
    -- Basic identification
    bairro TEXT NOT NULL,
    zona TEXT,
    
    -- All fields from the document_rows data as TEXT to preserve original values
    altura_maxima_edificacao_isolada TEXT,
    coeficiente_aproveitamento_basico TEXT,
    coeficiente_aproveitamento_maximo TEXT,
    taxa_permeabilidade_ate_1500m2 TEXT,
    taxa_permeabilidade_acima_1500m2 TEXT,
    fator_conversao_taxa_permeabilidade TEXT,
    
    -- Setbacks and spacing
    recuo_jardim TEXT,
    afastamentos_frente TEXT,
    afastamentos_laterais TEXT,
    afastamentos_fundos TEXT,
    
    -- Lot specifications
    area_minima_lote TEXT,
    testada_minima_lote TEXT,
    modulo_fracionamento TEXT,
    
    -- Block specifications
    face_maxima_quarteirao TEXT,
    area_maxima_quarteirao TEXT,
    area_minima_quarteirao TEXT,
    
    -- Subdivision and development rules
    enquadramento_loteamento TEXT,
    enquadramento_fracionamento TEXT,
    enquadramento_desmembramento_tipo_1 TEXT,
    enquadramento_desmembramento_tipo_2 TEXT,
    enquadramento_desmembramento_tipo_3 TEXT,
    
    -- Public area requirements for subdivisions
    area_publica_equipamentos_loteamento TEXT,
    area_publica_malha_viaria_loteamento TEXT,
    area_publica_equipamentos_desmembramento_tipo_1 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_1 TEXT,
    area_publica_equipamentos_desmembramento_tipo_2 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_2 TEXT,
    area_publica_equipamentos_desmembramento_tipo_3 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_3 TEXT,
    area_destinacao_publica_equipamentos_fracionamento TEXT,
    area_destinacao_publica_malha_viaria_fracionamento TEXT,
    
    -- +4D coefficients (additional development rights)
    coeficiente_aproveitamento_basico_4d TEXT,
    coeficiente_aproveitamento_maximo_4d TEXT,
    
    -- Commercial use restrictions
    comercio_varejista_inocuo_restricao_porte TEXT,
    comercio_varejista_ia1_restricao_porte TEXT,
    comercio_varejista_ia2_restricao_porte TEXT,
    comercio_atacadista_ia1_restricao_porte TEXT,
    comercio_atacadista_ia2_restricao_porte TEXT,
    comercio_atacadista_ia3_restricao_porte TEXT,
    
    -- Service use restrictions
    servico_inocuo_restricao_porte TEXT,
    servico_ia1_restricao_porte TEXT,
    servico_ia2_restricao_porte TEXT,
    servico_ia3_restricao_porte TEXT,
    
    -- Industrial use restrictions
    industria_inocua_restricao_porte TEXT,
    industria_interferencia_ambiental_restricao_porte TEXT,
    
    -- Entertainment control
    nivel_controle_polarizacao_entretenimento_noturno TEXT,
    
    -- Metadata
    dataset_id TEXT DEFAULT '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_regime_raw_bairro ON regime_urbanistico_raw(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_raw_zona ON regime_urbanistico_raw(zona);
CREATE INDEX IF NOT EXISTS idx_regime_raw_bairro_zona ON regime_urbanistico_raw(bairro, zona);
CREATE INDEX IF NOT EXISTS idx_regime_raw_dataset ON regime_urbanistico_raw(dataset_id);

-- RLS (Row Level Security)
ALTER TABLE regime_urbanistico_raw ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to regime_urbanistico_raw" ON regime_urbanistico_raw
    FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE regime_urbanistico_raw IS 'Raw regime urbanístico data from Porto Alegre PDPOA 2025 - all original values preserved as TEXT';
COMMENT ON COLUMN regime_urbanistico_raw.bairro IS 'Nome do bairro';
COMMENT ON COLUMN regime_urbanistico_raw.zona IS 'Código da zona (ex: ZOT 13)';
COMMENT ON COLUMN regime_urbanistico_raw.dataset_id IS 'ID do dataset de origem no document_rows';
COMMENT ON COLUMN regime_urbanistico_raw.metadata IS 'Metadata adicional do processo de extração';

-- Create a view that attempts to convert numeric values for easier querying
CREATE OR REPLACE VIEW regime_urbanistico_numeric AS
SELECT 
    id,
    bairro,
    zona,
    
    -- Convert numeric fields where possible
    CASE 
        WHEN altura_maxima_edificacao_isolada ~ '^[0-9]+\.?[0-9]*$' 
        THEN altura_maxima_edificacao_isolada::NUMERIC 
        ELSE NULL 
    END as altura_maxima_m,
    
    CASE 
        WHEN coeficiente_aproveitamento_basico ~ '^[0-9]+\.?[0-9]*$' 
        THEN coeficiente_aproveitamento_basico::NUMERIC 
        ELSE NULL 
    END as ca_basico,
    
    CASE 
        WHEN coeficiente_aproveitamento_maximo ~ '^[0-9]+\.?[0-9]*$' 
        THEN coeficiente_aproveitamento_maximo::NUMERIC 
        ELSE NULL 
    END as ca_maximo,
    
    CASE 
        WHEN taxa_permeabilidade_ate_1500m2 ~ '^[0-9]+\.?[0-9]*$' 
        THEN taxa_permeabilidade_ate_1500m2::NUMERIC 
        ELSE NULL 
    END as taxa_permeabilidade,
    
    CASE 
        WHEN recuo_jardim ~ '^[0-9]+\.?[0-9]*$' 
        THEN recuo_jardim::NUMERIC 
        ELSE NULL 
    END as recuo_jardim_m,
    
    CASE 
        WHEN area_minima_lote ~ '^[0-9]+\.?[0-9]*$' 
        THEN area_minima_lote::NUMERIC 
        ELSE NULL 
    END as area_min_lote_m2,
    
    CASE 
        WHEN testada_minima_lote ~ '^[0-9]+\.?[0-9]*$' 
        THEN testada_minima_lote::NUMERIC 
        ELSE NULL 
    END as testada_min_lote_m,
    
    CASE 
        WHEN face_maxima_quarteirao ~ '^[0-9]+\.?[0-9]*$' 
        THEN face_maxima_quarteirao::NUMERIC 
        ELSE NULL 
    END as face_max_quarteirao_m,
    
    -- Keep original text values for complex rules
    afastamentos_frente,
    afastamentos_laterais,
    afastamentos_fundos,
    enquadramento_loteamento,
    nivel_controle_polarizacao_entretenimento_noturno,
    
    -- Metadata
    dataset_id,
    metadata,
    created_at,
    updated_at
    
FROM regime_urbanistico_raw;

-- Comment on the view
COMMENT ON VIEW regime_urbanistico_numeric IS 'View que converte valores numéricos do regime_urbanistico_raw quando possível';