-- =====================================================
-- CRIAR TABELAS CORRETAS DE REGIME URBANÍSTICO E ZOTS
-- Execute este script COMPLETO no Supabase SQL Editor
-- =====================================================

-- 1. Limpar tabelas antigas (se existirem)
DROP TABLE IF EXISTS regime_urbanistico CASCADE;
DROP TABLE IF EXISTS zots_bairros CASCADE;

-- 2. Criar tabela regime_urbanistico com estrutura SIMPLIFICADA
-- Focando nos campos essenciais que realmente existem no Excel
CREATE TABLE regime_urbanistico (
    id SERIAL PRIMARY KEY,
    
    -- Identificação
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    
    -- Parâmetros principais (valores numéricos)
    altura_maxima DECIMAL(10,2),
    coef_aproveitamento_basico DECIMAL(10,2),
    coef_aproveitamento_maximo DECIMAL(10,2),
    area_minima_lote DECIMAL(10,2),
    testada_minima_lote DECIMAL(10,2),
    
    -- Todos os outros campos como TEXT para preservar dados originais
    modulo_fracionamento TEXT,
    face_maxima_quarteirao TEXT,
    area_maxima_quarteirao TEXT,
    area_minima_quarteirao TEXT,
    
    -- Fracionamento
    enquadramento_fracionamento TEXT,
    area_publica_viaria_fracionamento TEXT,
    area_publica_equip_fracionamento TEXT,
    
    -- Desmembramento Tipo 1
    enquadramento_desmembramento_t1 TEXT,
    area_publica_viaria_desmembramento_t1 TEXT,
    area_publica_equip_desmembramento_t1 TEXT,
    
    -- Desmembramento Tipo 2
    enquadramento_desmembramento_t2 TEXT,
    area_publica_viaria_desmembramento_t2 TEXT,
    area_publica_equip_desmembramento_t2 TEXT,
    
    -- Desmembramento Tipo 3
    enquadramento_desmembramento_t3 TEXT,
    area_publica_viaria_desmembramento_t3 TEXT,
    area_publica_equip_desmembramento_t3 TEXT,
    
    -- Loteamento
    enquadramento_loteamento TEXT,
    area_publica_viaria_loteamento TEXT,
    area_publica_equip_loteamento TEXT,
    
    -- Coeficientes +4D
    coef_basico_4d TEXT,
    coef_maximo_4d TEXT,
    
    -- Afastamentos
    afastamento_frente TEXT,
    afastamento_lateral TEXT,
    afastamento_fundos TEXT,
    
    -- Taxa de Permeabilidade
    taxa_permeabilidade_acima_1500 TEXT,
    taxa_permeabilidade_ate_1500 TEXT,
    fator_conversao_permeabilidade TEXT,
    
    -- Recuo
    recuo_jardim TEXT,
    
    -- Atividades - Comércio
    comercio_varejista_inocuo TEXT,
    comercio_varejista_ia1 TEXT,
    comercio_varejista_ia2 TEXT,
    comercio_atacadista_ia1 TEXT,
    comercio_atacadista_ia2 TEXT,
    comercio_atacadista_ia3 TEXT,
    
    -- Atividades - Serviços
    servico_inocuo TEXT,
    servico_ia1 TEXT,
    servico_ia2 TEXT,
    servico_ia3 TEXT,
    
    -- Atividades - Indústria
    industria_inocua TEXT,
    industria_interferencia_ambiental TEXT,
    
    -- Entretenimento
    nivel_controle_entretenimento TEXT,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Criar índices para regime_urbanistico
CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);
CREATE INDEX idx_regime_altura ON regime_urbanistico(altura_maxima);
CREATE INDEX idx_regime_coef_basico ON regime_urbanistico(coef_aproveitamento_basico);
CREATE INDEX idx_regime_coef_maximo ON regime_urbanistico(coef_aproveitamento_maximo);

-- 4. Criar tabela zots_bairros CORRETA
CREATE TABLE zots_bairros (
    id SERIAL PRIMARY KEY,
    
    -- Campos do Excel
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    total_zonas_no_bairro INTEGER DEFAULT 0,
    tem_zona_especial VARCHAR(10) DEFAULT 'Não', -- Armazenar como texto: 'Sim' ou 'Não'
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Criar índices para zots_bairros
CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_bairro_zona ON zots_bairros(bairro, zona);
CREATE INDEX idx_zots_tem_especial ON zots_bairros(tem_zona_especial);

-- 6. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regime_urbanistico_updated_at 
BEFORE UPDATE ON regime_urbanistico
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zots_bairros_updated_at 
BEFORE UPDATE ON zots_bairros
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Verificar criação das tabelas
SELECT 
    'TABELAS CRIADAS:' as info;

SELECT 
    table_name,
    column_count
FROM (
    SELECT 
        'regime_urbanistico' as table_name,
        COUNT(*) as column_count
    FROM information_schema.columns
    WHERE table_name = 'regime_urbanistico'
    AND table_schema = 'public'
    
    UNION ALL
    
    SELECT 
        'zots_bairros' as table_name,
        COUNT(*) as column_count
    FROM information_schema.columns
    WHERE table_name = 'zots_bairros'
    AND table_schema = 'public'
) as tables
ORDER BY table_name;

-- 8. Listar primeiras 5 colunas de cada tabela para confirmação
SELECT 
    'ESTRUTURA regime_urbanistico (primeiras 10 colunas):' as info;

SELECT 
    ordinal_position,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'regime_urbanistico'
AND table_schema = 'public'
ORDER BY ordinal_position
LIMIT 10;

SELECT 
    'ESTRUTURA zots_bairros:' as info;

SELECT 
    ordinal_position,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'zots_bairros'
AND table_schema = 'public'
ORDER BY ordinal_position;