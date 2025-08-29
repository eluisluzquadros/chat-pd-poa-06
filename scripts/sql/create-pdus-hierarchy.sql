-- ============================================================
-- ESTRUTURA HIERÁRQUICA COMPLETA DO PDUS
-- Baseada no índice ABNT oficial
-- ============================================================

-- ============================================================
-- PARTES DO PDUS (3 partes principais)
-- ============================================================

INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, article_start, article_end, order_index, full_path)
VALUES 
    ('PDUS', 'parte', 'I', 'Plano Estratégico', 1, 115, 1, 'Parte I'),
    ('PDUS', 'parte', 'II', 'Planejamento, Gestão e Execução da Política Urbana', 116, 208, 2, 'Parte II'),
    ('PDUS', 'parte', 'III', 'Disposições Finais e Transitórias', 209, 217, 3, 'Parte III')
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- TÍTULOS DO PDUS (8 títulos distribuídos nas partes)
-- ============================================================

WITH parte_ids AS (
    SELECT id, hierarchy_number 
    FROM legal_hierarchy 
    WHERE document_type = 'PDUS' AND hierarchy_type = 'parte'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'titulo',
    tit.number,
    tit.name,
    p.id,
    tit.art_start,
    tit.art_end,
    tit.order_idx,
    'Parte ' || p.hierarchy_number || ' > Título ' || tit.number
FROM parte_ids p
JOIN (VALUES
    -- Títulos da Parte I
    ('I', 'I', 'Das Disposições Gerais', 1, 6, 1),
    ('I', 'II', 'Dos Objetivos', 7, 13, 2),
    ('I', 'III', 'Do Modelo Espacial', 14, 114, 3),
    ('I', 'IV', 'Das Iniciativas Prioritárias', 115, 115, 4),
    -- Títulos da Parte II
    ('II', 'I', 'Do Sistema de Gestão, Controle, Planejamento e Financiamento Urbano', 116, 139, 5),
    ('II', 'II', 'Dos Instrumentos Urbanísticos', 140, 208, 6)
) AS tit(parte_num, number, name, art_start, art_end, order_idx)
ON p.hierarchy_number = tit.parte_num
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- CAPÍTULOS DO PDUS (24 capítulos)
-- ============================================================

-- Capítulos do Título III (Parte I)
WITH titulo_iii AS (
    SELECT h.id 
    FROM legal_hierarchy h
    JOIN legal_hierarchy p ON h.parent_id = p.id
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'titulo' 
        AND h.hierarchy_number = 'III'
        AND p.hierarchy_number = 'I'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    cap.number,
    cap.name,
    t.id,
    cap.art_start,
    cap.art_end,
    cap.order_idx,
    'Parte I > Título III > Capítulo ' || cap.number
FROM titulo_iii t
CROSS JOIN (VALUES
    ('I', 'Dos Sistemas Estruturantes', 15, 55, 1),
    ('II', 'Do Modelo de Ocupação do Território', 56, 56, 2),
    ('III', 'Das Macrozonas', 57, 106, 3),
    ('IV', 'Das Unidades de Planejamento Local', 107, 108, 4),
    ('V', 'Das Zonas de Ocupação', 109, 113, 5),
    ('VI', 'Das Zonas de Ordenamento Territorial', 114, 114, 6)
) AS cap(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- Capítulos do Título I (Parte II)
WITH titulo_i_parte_ii AS (
    SELECT h.id 
    FROM legal_hierarchy h
    JOIN legal_hierarchy p ON h.parent_id = p.id
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'titulo' 
        AND h.hierarchy_number = 'I'
        AND p.hierarchy_number = 'II'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    cap.number,
    cap.name,
    t.id,
    cap.art_start,
    cap.art_end,
    cap.order_idx,
    'Parte II > Título I > Capítulo ' || cap.number
FROM titulo_i_parte_ii t
CROSS JOIN (VALUES
    ('I', 'Da Unidade Técnica de Planejamento Urbano', 125, 125, 7),
    ('II', 'Do Comitê dos Estudos de Impacto de Vizinhança', 126, 126, 8),
    ('III', 'Do Comitê de Gerenciamento do Espaço Público', 127, 127, 9),
    ('IV', 'Do Centro de Inteligência Territorial', 128, 133, 10),
    ('V', 'Do Conselho Municipal de Desenvolvimento Urbano Ambiental', 134, 135, 11),
    ('VI', 'Da Compatibilização entre Políticas e Regulações Setoriais', 136, 139, 12)
) AS cap(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- Capítulos do Título II (Parte II)
WITH titulo_ii_parte_ii AS (
    SELECT h.id 
    FROM legal_hierarchy h
    JOIN legal_hierarchy p ON h.parent_id = p.id
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'titulo' 
        AND h.hierarchy_number = 'II'
        AND p.hierarchy_number = 'II'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'capitulo',
    cap.number,
    cap.name,
    t.id,
    cap.art_start,
    cap.art_end,
    cap.order_idx,
    'Parte II > Título II > Capítulo ' || cap.number
FROM titulo_ii_parte_ii t
CROSS JOIN (VALUES
    ('I', 'Dos Planos Urbanísticos e Instrumentos de Controle', 142, 169, 13),
    ('II', 'Da Parceria para Renovação Urbana', 170, 170, 14),
    ('III', 'Dos Instrumentos de Gestão do Território Urbano', 171, 197, 15),
    ('IV', 'Da Regularização Fundiária e do Reassentamento', 198, 201, 16),
    ('V', 'Da Política de Incentivos para o Desenvolvimento Urbano', 202, 208, 17)
) AS cap(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- SEÇÕES E SUBSEÇÕES DO PDUS (23+ elementos)
-- ============================================================

-- Seções do Capítulo I do Título III (Sistemas Estruturantes)
WITH cap_sistemas AS (
    SELECT h.id 
    FROM legal_hierarchy h
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'capitulo' 
        AND h.hierarchy_number = 'I'
        AND h.hierarchy_name = 'Dos Sistemas Estruturantes'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'secao',
    sec.number,
    sec.name,
    c.id,
    sec.art_start,
    sec.art_end,
    sec.order_idx,
    'Parte I > Título III > Capítulo I > Seção ' || sec.number
FROM cap_sistemas c
CROSS JOIN (VALUES
    ('I', 'Do Sistema Ecológico', 18, 21, 1),
    ('II', 'Do Sistema de Espaços Abertos', 22, 28, 2),
    ('III', 'Do Sistema de Estrutura e Infraestrutura Urbana', 29, 50, 3),
    ('IV', 'Do Sistema Socioeconômico', 51, 55, 4)
) AS sec(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- Subseções do Sistema de Espaços Abertos
WITH secao_espacos AS (
    SELECT h.id 
    FROM legal_hierarchy h
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'secao' 
        AND h.hierarchy_number = 'II'
        AND h.hierarchy_name = 'Do Sistema de Espaços Abertos'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'subsecao',
    'I',
    'Das Áreas e Elementos de Interesse Cultural',
    s.id,
    25,
    28,
    1,
    'Parte I > Título III > Capítulo I > Seção II > Subseção I'
FROM secao_espacos s
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- Subseções do Sistema de Estrutura e Infraestrutura
WITH secao_estrutura AS (
    SELECT h.id 
    FROM legal_hierarchy h
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'secao' 
        AND h.hierarchy_number = 'III'
        AND h.hierarchy_name = 'Do Sistema de Estrutura e Infraestrutura Urbana'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'subsecao',
    sub.number,
    sub.name,
    s.id,
    sub.art_start,
    sub.art_end,
    sub.order_idx,
    'Parte I > Título III > Capítulo I > Seção III > Subseção ' || sub.number
FROM secao_estrutura s
CROSS JOIN (VALUES
    ('I', 'Da Estrutura Viária', 36, 38, 2),
    ('II', 'Da Estrutura Férrea', 39, 42, 3),
    ('III', 'Da Estrutura Hidroviária', 43, 46, 4),
    ('IV', 'Da Estrutura Aeroviária', 47, 47, 5),
    ('V', 'Dos Sistemas de Transporte Urbano e de Transporte Ativo', 48, 50, 6)
) AS sub(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- CRIAR VIEW PARA NAVEGAÇÃO HIERÁRQUICA DO PDUS
-- ============================================================

CREATE OR REPLACE VIEW pdus_hierarchy_navigation AS
WITH RECURSIVE hierarchy_tree AS (
    -- Nível raiz (partes)
    SELECT 
        id,
        hierarchy_type,
        hierarchy_number,
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
    
    -- Níveis filhos recursivos
    SELECT 
        h.id,
        h.hierarchy_type,
        h.hierarchy_number,
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
    END || ' ' || hierarchy_number as display_number,
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
-- SEÇÕES DAS MACROZONAS (9 seções para as 9 macrozonas)
-- ============================================================

WITH cap_macrozonas AS (
    SELECT h.id 
    FROM legal_hierarchy h
    WHERE h.document_type = 'PDUS' 
        AND h.hierarchy_type = 'capitulo' 
        AND h.hierarchy_number = 'III'
        AND h.hierarchy_name = 'Das Macrozonas'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'secao',
    mz.number,
    mz.name,
    c.id,
    mz.art_start,
    mz.art_end,
    mz.order_idx,
    'Parte I > Título III > Capítulo III > Seção ' || mz.number
FROM cap_macrozonas c
CROSS JOIN (VALUES
    ('I', 'Da Macrozona 1', 60, 72, 5),
    ('II', 'Da Macrozona 2', 73, 75, 6),
    ('III', 'Da Macrozona 3', 76, 80, 7),
    ('IV', 'Da Macrozona 4', 81, 86, 8),
    ('V', 'Da Macrozona 5', 87, 89, 9),
    ('VI', 'Da Macrozona 6', 90, 94, 10),
    ('VII', 'Da Macrozona 7', 95, 97, 11),
    ('VIII', 'Da Macrozona 8', 98, 104, 12),
    ('IX', 'Da Macrozona 9', 105, 106, 13)
) AS mz(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

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

-- Teste 2: Verificar hierarquia do Art. 36 (Estrutura Viária)
SELECT * FROM get_article_hierarchy('PDUS', 36);

-- Teste 3: Visualizar árvore completa do PDUS (primeiros 30 elementos)
SELECT 
    REPEAT('  ', level - 1) || display_number || ' - ' || hierarchy_name as estrutura,
    article_range
FROM pdus_hierarchy_navigation
ORDER BY path_array
LIMIT 30;