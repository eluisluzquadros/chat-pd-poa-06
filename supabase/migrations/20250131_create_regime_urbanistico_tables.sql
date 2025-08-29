-- Migration: Criar tabelas para dados de regime urbanístico
-- Data: 2025-07-31

-- Tabela para dados de Regime Urbanístico
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    altura_maxima_edificacao_isolada TEXT,
    coeficiente_aproveitamento_basico TEXT,
    coeficiente_aproveitamento_maximo TEXT,
    area_minima_lote TEXT,
    testada_minima_lote TEXT,
    modulo_fracionamento TEXT,
    face_maxima_quarteirao TEXT,
    area_maxima_quarteirao TEXT,
    area_minima_quarteirao TEXT,
    enquadramento_fracionamento TEXT,
    area_destinacao_publica_malha_viaria_fracionamento TEXT,
    area_destinacao_publica_equipamentos_fracionamento TEXT,
    enquadramento_desmembramento_tipo_1 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_1 TEXT,
    area_publica_equipamentos_desmembramento_tipo_1 TEXT,
    enquadramento_desmembramento_tipo_2 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_2 TEXT,
    area_publica_equipamentos_desmembramento_tipo_2 TEXT,
    enquadramento_desmembramento_tipo_3 TEXT,
    area_publica_malha_viaria_desmembramento_tipo_3 TEXT,
    area_publica_equipamentos_desmembramento_tipo_3 TEXT,
    enquadramento_loteamento TEXT,
    area_publica_malha_viaria_loteamento TEXT,
    area_publica_equipamentos_loteamento TEXT,
    coeficiente_aproveitamento_basico_4d TEXT,
    coeficiente_aproveitamento_maximo_4d TEXT,
    afastamentos_frente TEXT,
    afastamentos_laterais TEXT,
    afastamentos_fundos TEXT,
    taxa_permeabilidade_acima_1500m TEXT,
    taxa_permeabilidade_ate_1500m TEXT,
    fator_conversao_taxa_permeabilidade TEXT,
    recuo_jardim TEXT,
    comercio_varejista_inocuo_restricao_porte TEXT,
    comercio_varejista_ia1_restricao_porte TEXT,
    comercio_varejista_ia2_restricao_porte TEXT,
    comercio_atacadista_ia1_restricao_porte TEXT,
    comercio_atacadista_ia2_restricao_porte TEXT,
    comercio_atacadista_ia3_restricao_porte TEXT,
    servico_inocuo_restricao_porte TEXT,
    servico_ia1_restricao_porte TEXT,
    servico_ia2_restricao_porte TEXT,
    servico_ia3_restricao_porte TEXT,
    industria_inocua_restricao_porte TEXT,
    industria_interferencia_ambiental_restricao_porte TEXT,
    nivel_controle_polarizacao_entretenimento_noturno TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);

-- Tabela para dados de ZOTs vs Bairros
CREATE TABLE IF NOT EXISTS zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    total_zonas_no_bairro INTEGER,
    tem_zona_especial BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX IF NOT EXISTS idx_zots_zona ON zots_bairros(zona);
CREATE INDEX IF NOT EXISTS idx_zots_bairro_zona ON zots_bairros(bairro, zona);
CREATE INDEX IF NOT EXISTS idx_zots_zona_especial ON zots_bairros(tem_zona_especial);

-- RLS (Row Level Security) - Permitir leitura para usuários autenticados
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE zots_bairros ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Allow read access to regime_urbanistico" ON regime_urbanistico
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to zots_bairros" ON zots_bairros
    FOR SELECT USING (true);

-- Comentários para documentação
COMMENT ON TABLE regime_urbanistico IS 'Dados de regime urbanístico de Porto Alegre - PDPOA 2025';
COMMENT ON TABLE zots_bairros IS 'Relação entre ZOTs (Zonas de Ordenamento Territorial) e bairros - PDPOA 2025';

COMMENT ON COLUMN regime_urbanistico.bairro IS 'Nome do bairro';
COMMENT ON COLUMN regime_urbanistico.zona IS 'Código da zona de ordenamento';
COMMENT ON COLUMN zots_bairros.total_zonas_no_bairro IS 'Quantidade total de zonas no bairro';
COMMENT ON COLUMN zots_bairros.tem_zona_especial IS 'Indica se o bairro possui alguma zona especial';