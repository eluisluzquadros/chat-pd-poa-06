-- Criar tabela regime_urbanistico
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    area_total_ha DECIMAL(10,2),
    populacao INTEGER,
    densidade_hab_ha DECIMAL(10,2),
    domicilios INTEGER,
    quarteirao_padrao_m INTEGER,
    divisao_lote BOOLEAN,
    remembramento BOOLEAN,
    quota_ideal_m2 INTEGER,
    to_base DECIMAL(5,2),
    to_max DECIMAL(5,2),
    ca_max DECIMAL(5,2),
    altura_max_m DECIMAL(10,2),
    taxa_permeabilidade DECIMAL(5,2),
    recuo_jardim_m DECIMAL(10,2),
    recuo_lateral_m DECIMAL(10,2),
    recuo_fundos_m DECIMAL(10,2),
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
CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);
CREATE INDEX idx_regime_altura ON regime_urbanistico(altura_max_m);
CREATE INDEX idx_regime_metadata ON regime_urbanistico USING gin(metadata);

CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_caracteristicas ON zots_bairros USING gin(caracteristicas);