-- Criar tabela regime_urbanistico
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    altura_max_m DECIMAL(10,2),
    ca_max DECIMAL(5,2),
    to_base DECIMAL(5,2),
    to_max DECIMAL(5,2),
    taxa_permeabilidade DECIMAL(5,2),
    recuo_jardim_m DECIMAL(10,2),
    recuo_lateral_m DECIMAL(10,2),
    recuo_fundos_m DECIMAL(10,2),
    area_total_ha DECIMAL(10,2),
    populacao INTEGER,
    densidade_hab_ha DECIMAL(10,2),
    domicilios INTEGER,
    quarteirao_padrao_m INTEGER,
    divisao_lote BOOLEAN,
    remembramento BOOLEAN,
    quota_ideal_m2 INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela zots_bairros
CREATE TABLE IF NOT EXISTS zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    caracteristicas JSONB DEFAULT '{}',
    restricoes JSONB DEFAULT '{}',
    incentivos JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX IF NOT EXISTS idx_regime_altura ON regime_urbanistico(altura_max_m);
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);

CREATE INDEX IF NOT EXISTS idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX IF NOT EXISTS idx_zots_zona ON zots_bairros(zona);

-- Habilitar RLS
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE zots_bairros ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura
CREATE POLICY "Enable read for all users" ON regime_urbanistico FOR SELECT USING (true);
CREATE POLICY "Enable read for all users" ON zots_bairros FOR SELECT USING (true);