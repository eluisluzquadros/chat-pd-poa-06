-- Schema SQL gerado em 2025-07-31T18:43:31.936Z

-- Tabela para dados de Regime Urbanístico
-- Fonte: PDPOA2025-Regime_Urbanistico.xlsx
-- Registros: 387
DROP TABLE IF EXISTS regime_urbanistico;

CREATE TABLE regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro TEXT NOT NULL,
    zona TEXT NOT NULL,
    altura_m_xima_edifica_o_isolada TEXT, -- Altura Máxima - Edificação Isolada
    coeficiente_de_aproveitamento_b_sico TEXT, -- Coeficiente de Aproveitamento - Básico
    coeficiente_de_aproveitamento_m_ximo TEXT, -- Coeficiente de Aproveitamento - Máximo
    rea_m_nima_do_lote TEXT, -- Área Mínima do Lote
    testada_m_nima_do_lote TEXT, -- Testada Mínima do Lote
    m_dulo_de_fracionamento TEXT, -- Módulo de Fracionamento
    face_m_xima_do_quarteir_o TEXT, -- Face Máxima do Quarteirão
    rea_m_xima_do_quarteir_o TEXT, -- Área Máxima do Quarteirão
    rea_m_nima_do_quarteir_o TEXT, -- Área Mínima do Quarteirão
    enquadramento_fracionamento TEXT, -- Enquadramento (Fracionamento)
    rea_de_destina_o_p_blica_malha_vi_ria_fracionamento TEXT, -- Área de Destinação Pública – Malha Viária (Fracionamento)
    rea_de_destina_o_p_blica_equipamentos_fracionamento TEXT, -- Área de Destinação Pública – Equipamentos (Fracionamento)
    enquadramento_desmembramento_tipo_1 TEXT, -- Enquadramento (Desmembramento Tipo 1)
    rea_p_blica_malha_vi_ria_desmembramento_tipo_1 TEXT, -- Área Pública – Malha Viária (Desmembramento Tipo 1)
    rea_p_blica_equipamentos_desmembramento_tipo_1 TEXT, -- Área Pública – Equipamentos (Desmembramento Tipo 1)
    enquadramento_desmembramento_tipo_2 TEXT, -- Enquadramento (Desmembramento Tipo 2)
    rea_p_blica_malha_vi_ria_desmembramento_tipo_2 TEXT, -- Área Pública – Malha Viária (Desmembramento Tipo 2)
    rea_p_blica_equipamentos_desmembramento_tipo_2 TEXT, -- Área Pública – Equipamentos (Desmembramento Tipo 2)
    enquadramento_desmembramento_tipo_3 TEXT, -- Enquadramento (Desmembramento Tipo 3)
    rea_p_blica_malha_vi_ria_desmembramento_tipo_3 TEXT, -- Área Pública – Malha Viária (Desmembramento Tipo 3)
    rea_p_blica_equipamentos_desmembramento_tipo_3 TEXT, -- Área Pública – Equipamentos (Desmembramento Tipo 3)
    enquadramento_loteamento TEXT, -- Enquadramento (Loteamento)
    rea_p_blica_malha_vi_ria_loteamento TEXT, -- Área Pública – Malha Viária (Loteamento)
    rea_p_blica_equipamentos_loteamento TEXT, -- Área Pública – Equipamentos (Loteamento)
    coeficiente_de_aproveitamento_b_sico_4d TEXT, -- Coeficiente de Aproveitamento Básico +4D
    coeficiente_de_aproveitamento_m_ximo_4d TEXT, -- Coeficiente de Aproveitamento Máximo +4D
    afastamentos_frente TEXT, -- Afastamentos - Frente
    afastamentos_laterais TEXT, -- Afastamentos - Laterais
    afastamentos_fundos TEXT, -- Afastamentos - Fundos
    taxa_de_permeabilidade_acima_de_1_500_m TEXT, -- Taxa de Permeabilidade (acima de 1.500 m²)
    taxa_de_permeabilidade_at_1_500_m TEXT, -- Taxa de Permeabilidade (até 1.500 m²)
    fator_de_convers_o_da_taxa_de_permeabilidade TEXT, -- Fator de Conversão da Taxa de Permeabilidade
    recuo_de_jardim TEXT, -- Recuo de Jardim
    com_rcio_varejista_in_cuo_restri_o_porte TEXT, -- Comércio Varejista Inócuo – Restrição / Porte
    com_rcio_varejista_ia1_restri_o_porte TEXT, -- Comércio Varejista IA1 – Restrição / Porte
    com_rcio_varejista_ia2_restri_o_porte TEXT, -- Comércio Varejista IA2 – Restrição / Porte
    com_rcio_atacadista_ia1_restri_o_porte TEXT, -- Comércio Atacadista IA1 – Restrição / Porte
    com_rcio_atacadista_ia2_restri_o_porte TEXT, -- Comércio Atacadista IA2 – Restrição / Porte
    com_rcio_atacadista_ia3_restri_o_porte TEXT, -- Comércio Atacadista IA3 – Restrição / Porte
    servi_o_in_cuo_restri_o_porte TEXT, -- Serviço Inócuo – Restrição / Porte
    servi_o_ia1_restri_o_porte TEXT, -- Serviço IA1 – Restrição / Porte
    servi_o_ia2_restri_o_porte TEXT, -- Serviço IA2 – Restrição / Porte
    servi_o_ia3_restri_o_porte TEXT, -- Serviço IA3 – Restrição / Porte
    ind_stria_in_cua_restri_o_porte TEXT, -- Indústria Inócua – Restrição / Porte
    ind_stria_com_interfer_ncia_ambiental_restri_o_porte TEXT, -- Indústria com Interferência Ambiental – Restrição / Porte
    n_vel_de_controle_de_polariza_o_de_entretenimento_noturno TEXT, -- Nível de Controle de Polarização de Entretenimento Noturno
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);

-- Tabela para dados de ZOTs vs Bairros
-- Fonte: PDPOA2025-ZOTs_vs_Bairros.xlsx
-- Registros: 385
DROP TABLE IF EXISTS zots_bairros;

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
CREATE INDEX idx_zots_zona_especial ON zots_bairros(tem_zona_especial);

