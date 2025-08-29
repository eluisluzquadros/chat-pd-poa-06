-- =====================================================
-- CORRIGIR ESTRUTURA DA TABELA REGIME_URBANISTICO
-- Execute este script para recriar a tabela com a estrutura correta
-- =====================================================

-- 1. Fazer backup dos dados existentes (se houver)
CREATE TABLE IF NOT EXISTS regime_urbanistico_backup AS 
SELECT * FROM regime_urbanistico;

-- 2. Dropar a tabela antiga
DROP TABLE IF EXISTS regime_urbanistico CASCADE;

-- 3. Criar tabela com estrutura correta baseada no Excel real
CREATE TABLE regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    
    -- Parâmetros de altura e aproveitamento
    altura_maxima_edificacao_isolada NUMERIC(10,2),
    coeficiente_aproveitamento_basico NUMERIC(10,2),
    coeficiente_aproveitamento_maximo NUMERIC(10,2),
    
    -- Parâmetros do lote
    area_minima_lote NUMERIC(10,2),
    testada_minima_lote NUMERIC(10,2),
    modulo_fracionamento NUMERIC(10,2),
    
    -- Parâmetros do quarteirão
    face_maxima_quarteirao NUMERIC(10,2),
    area_maxima_quarteirao NUMERIC(10,2),
    area_minima_quarteirao NUMERIC(10,2),
    
    -- Fracionamento
    enquadramento_fracionamento TEXT,
    area_destinacao_publica_malha_viaria_fracionamento TEXT,
    area_destinacao_publica_equipamentos_fracionamento TEXT,
    
    -- Desmembramento Tipo 1
    enquadramento_desmembramento_tipo1 TEXT,
    area_publica_malha_viaria_desmembramento_tipo1 TEXT,
    area_publica_equipamentos_desmembramento_tipo1 TEXT,
    
    -- Desmembramento Tipo 2
    enquadramento_desmembramento_tipo2 TEXT,
    area_publica_malha_viaria_desmembramento_tipo2 TEXT,
    area_publica_equipamentos_desmembramento_tipo2 TEXT,
    
    -- Desmembramento Tipo 3
    enquadramento_desmembramento_tipo3 TEXT,
    area_publica_malha_viaria_desmembramento_tipo3 TEXT,
    area_publica_equipamentos_desmembramento_tipo3 TEXT,
    
    -- Loteamento
    enquadramento_loteamento TEXT,
    area_publica_malha_viaria_loteamento TEXT,
    area_publica_equipamentos_loteamento TEXT,
    
    -- Coeficientes +4D
    coeficiente_aproveitamento_basico_4d NUMERIC(10,2),
    coeficiente_aproveitamento_maximo_4d NUMERIC(10,2),
    
    -- Afastamentos
    afastamentos_frente TEXT,
    afastamentos_laterais TEXT,
    afastamentos_fundos TEXT,
    
    -- Taxa de Permeabilidade
    taxa_permeabilidade_acima_1500m2 TEXT,
    taxa_permeabilidade_ate_1500m2 TEXT,
    fator_conversao_taxa_permeabilidade TEXT,
    
    -- Recuo
    recuo_jardim TEXT,
    
    -- Comércio Varejista
    comercio_varejista_inocuo_restricao_porte TEXT,
    comercio_varejista_ia1_restricao_porte TEXT,
    comercio_varejista_ia2_restricao_porte TEXT,
    
    -- Comércio Atacadista
    comercio_atacadista_ia1_restricao_porte TEXT,
    comercio_atacadista_ia2_restricao_porte TEXT,
    comercio_atacadista_ia3_restricao_porte TEXT,
    
    -- Serviços
    servico_inocuo_restricao_porte TEXT,
    servico_ia1_restricao_porte TEXT,
    servico_ia2_restricao_porte TEXT,
    servico_ia3_restricao_porte TEXT,
    
    -- Indústria
    industria_inocua_restricao_porte TEXT,
    industria_interferencia_ambiental_restricao_porte TEXT,
    
    -- Entretenimento
    nivel_controle_polarizacao_entretenimento_noturno TEXT,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Criar índices importantes
CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);
CREATE INDEX idx_regime_altura ON regime_urbanistico(altura_maxima_edificacao_isolada);

-- 5. Criar tabela ZOTs vs Bairros correta
DROP TABLE IF EXISTS zots_bairros CASCADE;

CREATE TABLE zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    total_zonas_no_bairro INTEGER,
    tem_zona_especial BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_bairro_zona ON zots_bairros(bairro, zona);

-- 6. Verificar criação
SELECT 
    'regime_urbanistico' as tabela,
    COUNT(*) as colunas
FROM information_schema.columns
WHERE table_name = 'regime_urbanistico'
UNION ALL
SELECT 
    'zots_bairros' as tabela,
    COUNT(*) as colunas
FROM information_schema.columns
WHERE table_name = 'zots_bairros';

-- Resultado esperado:
-- regime_urbanistico: 51 colunas
-- zots_bairros: 7 colunas