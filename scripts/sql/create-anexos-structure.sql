-- ============================================================
-- ESTRUTURA DE ANEXOS DA LUOS E PDUS
-- Baseada no índice ABNT oficial
-- ============================================================

-- Criar tabela para anexos se não existir
CREATE TABLE IF NOT EXISTS legal_anexos (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    anexo_number VARCHAR(20) NOT NULL,
    anexo_name TEXT NOT NULL,
    anexo_type VARCHAR(50), -- 'mapa', 'tabela', 'regulamento', 'lista'
    description TEXT,
    file_path TEXT,
    content_text TEXT, -- Para conteúdo textual
    metadata JSONB,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, anexo_number)
);

-- ============================================================
-- ANEXOS DA LUOS (23 anexos)
-- ============================================================

INSERT INTO legal_anexos (document_type, anexo_number, anexo_name, anexo_type, description)
VALUES 
    -- 1. MAPAS E ZONEAMENTO
    ('LUOS', '1', 'Mapa - Zonas de Ordenamento Territorial (ZOT)', 'mapa', 'Mapa geral das 16 ZOTs do município de Porto Alegre'),
    
    -- 2. TABELAS DAS ZOT (16 tabelas)
    ('LUOS', '2', 'Tabelas - ZOT', 'tabela', 'Tabelas consolidadas das 16 Zonas de Ordenamento Territorial'),
    ('LUOS', '2.1', 'ZOT 1', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 1'),
    ('LUOS', '2.2', 'ZOT 2', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 2'),
    ('LUOS', '2.3', 'ZOT 3', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 3'),
    ('LUOS', '2.4', 'ZOT 4', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 4'),
    ('LUOS', '2.5', 'ZOT 5', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 5'),
    ('LUOS', '2.6', 'ZOT 6', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 6'),
    ('LUOS', '2.7', 'ZOT 7', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 7'),
    ('LUOS', '2.8', 'ZOT 8', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 8'),
    ('LUOS', '2.9', 'ZOT 9', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 9'),
    ('LUOS', '2.10', 'ZOT 10', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 10'),
    ('LUOS', '2.11', 'ZOT 11', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 11'),
    ('LUOS', '2.12', 'ZOT 12', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 12'),
    ('LUOS', '2.13', 'ZOT 13', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 13'),
    ('LUOS', '2.14', 'ZOT 14', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 14'),
    ('LUOS', '2.15', 'ZOT 15', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 15'),
    ('LUOS', '2.16', 'ZOT 16', 'tabela', 'Parâmetros urbanísticos da Zona de Ordenamento Territorial 16'),
    
    -- 3. DISPOSIÇÕES ESPECÍFICAS
    ('LUOS', '3', 'Atividades e Prédios Preexistentes', 'regulamento', 'Normas para atividades e edificações preexistentes'),
    ('LUOS', '4', 'Controle de Polarização', 'regulamento', 'Critérios para controle de polarização de atividades'),
    ('LUOS', '5', 'Recuo de Jardim', 'tabela', 'Tabela de recuos de jardim por via'),
    ('LUOS', '6', 'Medidas Alternativas da Taxa de Permeabilidade', 'regulamento', 'Alternativas para cumprimento da taxa de permeabilidade'),
    ('LUOS', '7', 'Empreendimentos sujeitos ao Estudo de Impacto de Vizinhança (EIV)', 'lista', 'Lista de empreendimentos que requerem EIV')
ON CONFLICT (document_type, anexo_number) DO UPDATE
SET 
    anexo_name = EXCLUDED.anexo_name,
    anexo_type = EXCLUDED.anexo_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- ANEXOS DO PDUS (17 anexos)
-- ============================================================

INSERT INTO legal_anexos (document_type, anexo_number, anexo_name, anexo_type, description)
VALUES 
    -- 1. SISTEMAS ESTRUTURANTES
    ('PDUS', '1.1', 'Sistema Ecológico', 'mapa', 'Mapa do sistema ecológico municipal'),
    ('PDUS', '1.2', 'Sistema de Espaços Abertos', 'mapa', 'Mapa do sistema de espaços abertos'),
    ('PDUS', '1.2.1', 'Áreas de Interesse Cultural', 'mapa', 'Mapa das áreas de interesse cultural'),
    ('PDUS', '1.3', 'Sistema de Estrutura e Infraestrutura Urbana', 'mapa', 'Mapa da estrutura e infraestrutura urbana'),
    ('PDUS', '1.3.1', 'Malha Viária Básica/Classificação e Hierarquização', 'mapa', 'Classificação e hierarquização viária'),
    ('PDUS', '1.3.2', 'Classificação das Vias', 'tabela', 'Tabela de classificação das vias'),
    ('PDUS', '1.3.3', 'Elementos do Perfil Viário', 'tabela', 'Especificações dos perfis viários'),
    ('PDUS', '1.4', 'Sistema Socioeconômico', 'mapa', 'Mapa do sistema socioeconômico'),
    ('PDUS', '1.4.1', 'Áreas Especiais de Interesse Social/REURB', 'mapa', 'Mapa das AEIS e áreas de regularização'),
    
    -- 2. MODELO DE OCUPAÇÃO DO TERRITÓRIO
    ('PDUS', '2', 'Modelo de Ocupação do Território', 'mapa', 'Mapa do modelo de ocupação territorial'),
    
    -- 3. MACROZONAS
    ('PDUS', '3.1', 'Macrozonas - Mapa Geral', 'mapa', 'Mapa geral das 9 macrozonas'),
    ('PDUS', '3.2', 'Áreas Estruturadoras', 'mapa', 'Mapa das áreas estruturadoras'),
    ('PDUS', '3.2.1', '4º Distrito - Ações e Intervenções', 'mapa', 'Ações e intervenções no 4º Distrito'),
    
    -- 4. UNIDADES DE PLANEJAMENTO LOCAL
    ('PDUS', '4', 'Unidades de Planejamento Local', 'mapa', 'Mapa das 17 UPLs'),
    
    -- 5. ZONAS DE OCUPAÇÃO
    ('PDUS', '5', 'Zonas de Ocupação', 'mapa', 'Mapa das zonas de ocupação')
ON CONFLICT (document_type, anexo_number) DO UPDATE
SET 
    anexo_name = EXCLUDED.anexo_name,
    anexo_type = EXCLUDED.anexo_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- CRIAR VIEW PARA VISUALIZAÇÃO DE ANEXOS
-- ============================================================

CREATE OR REPLACE VIEW anexos_summary AS
SELECT 
    document_type,
    anexo_type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_processed THEN 1 END) as processed,
    COUNT(CASE WHEN NOT is_processed THEN 1 END) as pending,
    ROUND(COUNT(CASE WHEN is_processed THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as percent_complete
FROM legal_anexos
GROUP BY document_type, anexo_type
ORDER BY document_type, anexo_type;

-- ============================================================
-- CRIAR FUNÇÃO PARA VINCULAR ANEXOS COM ARTIGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS article_anexo_references (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    article_number INTEGER NOT NULL,
    anexo_id INTEGER REFERENCES legal_anexos(id),
    reference_type VARCHAR(50), -- 'menciona', 'regulamenta', 'detalha', 'complementa'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, article_number, anexo_id)
);

-- Inserir referências conhecidas
INSERT INTO article_anexo_references (document_type, article_number, anexo_id, reference_type)
SELECT 
    'LUOS',
    art_num,
    a.id,
    'regulamenta'
FROM (VALUES
    (5, '1'),   -- Art. 5 menciona mapa ZOT
    (6, '2.1'), -- Art. 6 sobre ZOT 1
    (7, '2.2'), -- Art. 7 sobre ZOT 2
    (8, '2.3'), -- Art. 8 sobre ZOT 3
    (9, '2.4'), -- Art. 9 sobre ZOT 4
    (10, '2.5'), -- Art. 10 sobre ZOT 5
    (11, '2.6'), -- Art. 11 sobre ZOT 6
    (12, '2.7'), -- Art. 12 sobre ZOT 7
    (13, '2.8'), -- Art. 13 sobre ZOT 8
    (14, '2.9'), -- Art. 14 sobre ZOT 9
    (15, '2.10'), -- Art. 15 sobre ZOT 10
    (16, '2.11'), -- Art. 16 sobre ZOT 11
    (17, '2.12'), -- Art. 17 sobre ZOT 12
    (18, '2.13'), -- Art. 18 sobre ZOT 13
    (19, '2.14'), -- Art. 19 sobre ZOT 14
    (20, '2.15'), -- Art. 20 sobre ZOT 15
    (21, '2.16'), -- Art. 21 sobre ZOT 16
    (83, '5'),   -- Art. 83 sobre recuo de jardim
    (76, '6'),   -- Art. 76 sobre taxa de permeabilidade
    (90, '7')    -- Art. 90 sobre EIV
) AS refs(art_num, anexo_num)
JOIN legal_anexos a ON a.document_type = 'LUOS' AND a.anexo_number = anexo_num
ON CONFLICT DO NOTHING;

-- ============================================================
-- TESTES DE VALIDAÇÃO DE ANEXOS
-- ============================================================

-- Teste 1: Resumo de anexos por tipo
SELECT * FROM anexos_summary;

-- Teste 2: Verificar total de anexos
SELECT 
    document_type,
    COUNT(*) as total_anexos
FROM legal_anexos
GROUP BY document_type
ORDER BY document_type;

-- Teste 3: Listar anexos não processados
SELECT 
    document_type,
    anexo_number,
    anexo_name,
    anexo_type
FROM legal_anexos
WHERE NOT is_processed
ORDER BY document_type, anexo_number
LIMIT 10;