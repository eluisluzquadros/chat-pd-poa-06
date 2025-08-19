-- ============================================================
-- ESTRUTURA HIERÁRQUICA COMPLETA DO PDUS (VERSÃO CORRIGIDA)
-- Corrige erro de duplicação em ON CONFLICT
-- ============================================================

-- ============================================================
-- LIMPAR DADOS ANTERIORES PARA EVITAR CONFLITOS
-- ============================================================

DELETE FROM legal_hierarchy WHERE document_type = 'PDUS';

-- ============================================================
-- PARTES DO PDUS (3 partes principais)
-- ============================================================

INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, article_start, article_end, order_index, full_path)
VALUES 
    ('PDUS', 'parte', 'I', 'Plano Estratégico', 1, 115, 1, 'Parte I'),
    ('PDUS', 'parte', 'II', 'Planejamento, Gestão e Execução da Política Urbana', 116, 208, 2, 'Parte II'),
    ('PDUS', 'parte', 'III', 'Disposições Finais e Transitórias', 209, 217, 3, 'Parte III');

-- ============================================================
-- TÍTULOS DO PDUS (usando identificadores únicos)
-- ============================================================

-- Títulos da Parte I
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'titulo',
    'P1-' || tit_num, -- Prefixo único para Parte I
    tit_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'parte' AND hierarchy_number = 'I'),
    art_start,
    art_end,
    ord_idx,
    'Parte I > Título ' || tit_num
FROM (VALUES
    ('I', 'Das Disposições Gerais', 1, 6, 1),
    ('II', 'Dos Objetivos', 7, 13, 2),
    ('III', 'Do Modelo Espacial', 14, 114, 3),
    ('IV', 'Das Iniciativas Prioritárias', 115, 115, 4)
) AS tit(tit_num, tit_name, art_start, art_end, ord_idx);

-- Títulos da Parte II
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'titulo',
    'P2-' || tit_num, -- Prefixo único para Parte II
    tit_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'parte' AND hierarchy_number = 'II'),
    art_start,
    art_end,
    ord_idx,
    'Parte II > Título ' || tit_num
FROM (VALUES
    ('I', 'Do Sistema de Gestão, Controle, Planejamento e Financiamento Urbano', 116, 139, 5),
    ('II', 'Dos Instrumentos Urbanísticos', 140, 208, 6)
) AS tit(tit_num, tit_name, art_start, art_end, ord_idx);

-- ============================================================
-- CAPÍTULOS DO PDUS
-- ============================================================

-- Capítulos do Título III (Parte I)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    'P1T3-' || cap_num, -- Identificador único
    cap_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'titulo' AND hierarchy_number = 'P1-III'),
    art_start,
    art_end,
    ord_idx,
    'Parte I > Título III > Capítulo ' || cap_num
FROM (VALUES
    ('I', 'Dos Sistemas Estruturantes', 15, 55, 1),
    ('II', 'Do Modelo de Ocupação do Território', 56, 56, 2),
    ('III', 'Das Macrozonas', 57, 106, 3),
    ('IV', 'Das Unidades de Planejamento Local', 107, 108, 4),
    ('V', 'Das Zonas de Ocupação', 109, 113, 5),
    ('VI', 'Das Zonas de Ordenamento Territorial', 114, 114, 6)
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx);

-- Capítulos do Título I (Parte II)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    'P2T1-' || cap_num, -- Identificador único
    cap_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'titulo' AND hierarchy_number = 'P2-I'),
    art_start,
    art_end,
    ord_idx,
    'Parte II > Título I > Capítulo ' || cap_num
FROM (VALUES
    ('I', 'Da Unidade Técnica de Planejamento Urbano', 125, 125, 7),
    ('II', 'Do Comitê dos Estudos de Impacto de Vizinhança', 126, 126, 8),
    ('III', 'Do Comitê de Gerenciamento do Espaço Público', 127, 127, 9),
    ('IV', 'Do Centro de Inteligência Territorial', 128, 133, 10),
    ('V', 'Do Conselho Municipal de Desenvolvimento Urbano Ambiental', 134, 135, 11),
    ('VI', 'Da Compatibilização entre Políticas e Regulações Setoriais', 136, 139, 12)
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx);

-- Capítulos do Título II (Parte II)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    'P2T2-' || cap_num, -- Identificador único
    cap_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'titulo' AND hierarchy_number = 'P2-II'),
    art_start,
    art_end,
    ord_idx,
    'Parte II > Título II > Capítulo ' || cap_num
FROM (VALUES
    ('I', 'Dos Planos Urbanísticos e Instrumentos de Controle', 142, 169, 13),
    ('II', 'Da Parceria para Renovação Urbana', 170, 170, 14),
    ('III', 'Dos Instrumentos de Gestão do Território Urbano', 171, 197, 15),
    ('IV', 'Da Regularização Fundiária e do Reassentamento', 198, 201, 16),
    ('V', 'Da Política de Incentivos para o Desenvolvimento Urbano', 202, 208, 17)
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx);

-- ============================================================
-- SEÇÕES E SUBSEÇÕES DO PDUS
-- ============================================================

-- Seções do Capítulo I do Título III (Sistemas Estruturantes)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'secao',
    'P1T3C1-' || sec_num, -- Identificador único
    sec_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'capitulo' AND hierarchy_number = 'P1T3-I'),
    art_start,
    art_end,
    ord_idx,
    'Parte I > Título III > Capítulo I > Seção ' || sec_num
FROM (VALUES
    ('I', 'Do Sistema Ecológico', 18, 21, 1),
    ('II', 'Do Sistema de Espaços Abertos', 22, 28, 2),
    ('III', 'Do Sistema de Estrutura e Infraestrutura Urbana', 29, 50, 3),
    ('IV', 'Do Sistema Socioeconômico', 51, 55, 4)
) AS sec(sec_num, sec_name, art_start, art_end, ord_idx);

-- Seções das Macrozonas
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'secao',
    'MZ-' || mz_num, -- Identificador único para macrozonas
    mz_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'capitulo' AND hierarchy_number = 'P1T3-III'),
    art_start,
    art_end,
    ord_idx,
    'Parte I > Título III > Capítulo III > Seção ' || mz_num
FROM (VALUES
    ('I', 'Da Macrozona 1', 60, 72, 5),
    ('II', 'Da Macrozona 2', 73, 75, 6),
    ('III', 'Da Macrozona 3', 76, 80, 7),
    ('IV', 'Da Macrozona 4', 81, 86, 8),
    ('V', 'Da Macrozona 5', 87, 89, 9),
    ('VI', 'Da Macrozona 6', 90, 94, 10),
    ('VII', 'Da Macrozona 7', 95, 97, 11),
    ('VIII', 'Da Macrozona 8', 98, 104, 12),
    ('IX', 'Da Macrozona 9', 105, 106, 13)
) AS mz(mz_num, mz_name, art_start, art_end, ord_idx);

-- ============================================================
-- CRIAR VIEW PARA NAVEGAÇÃO HIERÁRQUICA DO PDUS
-- ============================================================

DROP VIEW IF EXISTS pdus_hierarchy_navigation CASCADE;

CREATE VIEW pdus_hierarchy_navigation AS
WITH RECURSIVE hierarchy_tree AS (
    -- Nível raiz (partes)
    SELECT 
        id,
        hierarchy_type,
        hierarchy_number as display_number,
        hierarchy_number as raw_number,
        hierarchy_name,
        parent_id,
        article_start,
        article_end,
        full_path,
        order_index,
        1 as level,
        ARRAY[order_index] as path_array
    FROM legal_hierarchy
    WHERE document_type = 'PDUS' AND parent_id IS NULL
    
    UNION ALL
    
    -- Níveis filhos recursivos - extrair número limpo do identificador
    SELECT 
        h.id,
        h.hierarchy_type,
        CASE 
            WHEN h.hierarchy_number ~ '^P[0-9]+-' THEN 
                SUBSTRING(h.hierarchy_number FROM POSITION('-' IN h.hierarchy_number) + 1)
            WHEN h.hierarchy_number ~ '^P[0-9]T[0-9]-' THEN 
                SUBSTRING(h.hierarchy_number FROM POSITION('-' IN h.hierarchy_number) + 1)
            WHEN h.hierarchy_number ~ '^P[0-9]T[0-9]C[0-9]-' THEN 
                SUBSTRING(h.hierarchy_number FROM POSITION('-' IN h.hierarchy_number) + 1)
            WHEN h.hierarchy_number ~ '^MZ-' THEN 
                SUBSTRING(h.hierarchy_number FROM 4)
            ELSE h.hierarchy_number
        END as display_number,
        h.hierarchy_number as raw_number,
        h.hierarchy_name,
        h.parent_id,
        h.article_start,
        h.article_end,
        h.full_path,
        h.order_index,
        ht.level + 1,
        ht.path_array || h.order_index
    FROM legal_hierarchy h
    JOIN hierarchy_tree ht ON h.parent_id = ht.id
    WHERE h.document_type = 'PDUS'
)
SELECT 
    id,
    CASE hierarchy_type
        WHEN 'parte' THEN 'PARTE'
        WHEN 'titulo' THEN 'TÍTULO'
        WHEN 'capitulo' THEN 'CAPÍTULO'
        WHEN 'secao' THEN 'SEÇÃO'
        WHEN 'subsecao' THEN 'SUBSEÇÃO'
        ELSE UPPER(hierarchy_type)
    END || ' ' || display_number as display_text,
    hierarchy_name,
    CASE 
        WHEN article_start = article_end THEN 'Art. ' || article_start || 'º'
        WHEN article_start IS NOT NULL THEN 'Arts. ' || article_start || 'º a ' || article_end || 'º'
        ELSE ''
    END as article_range,
    full_path,
    level,
    path_array
FROM hierarchy_tree
ORDER BY path_array;

-- ============================================================
-- TESTES DE VALIDAÇÃO DO PDUS
-- ============================================================

-- Teste 1: Verificar estrutura completa
SELECT 
    hierarchy_type,
    COUNT(*) as total
FROM legal_hierarchy
WHERE document_type = 'PDUS'
GROUP BY hierarchy_type
ORDER BY 
    CASE hierarchy_type
        WHEN 'parte' THEN 1
        WHEN 'titulo' THEN 2
        WHEN 'capitulo' THEN 3
        WHEN 'secao' THEN 4
        WHEN 'subsecao' THEN 5
        ELSE 6
    END;

-- Teste 2: Visualizar primeiras 30 linhas da árvore
SELECT 
    REPEAT('  ', level - 1) || display_text || ' - ' || hierarchy_name as estrutura,
    article_range
FROM pdus_hierarchy_navigation
ORDER BY path_array
LIMIT 30;