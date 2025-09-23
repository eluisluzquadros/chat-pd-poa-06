-- ============================================================
-- ESTRUTURA HIERÁRQUICA COMPLETA DA LUOS (VERSÃO CORRIGIDA)
-- Corrige erro de duplicação em ON CONFLICT
-- ============================================================

-- Criar tabela para hierarquia se não existir
CREATE TABLE IF NOT EXISTS legal_hierarchy (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    hierarchy_type VARCHAR(20) NOT NULL, -- 'titulo', 'capitulo', 'secao', 'subsecao'
    hierarchy_number VARCHAR(20) NOT NULL,
    hierarchy_name TEXT NOT NULL,
    parent_id INTEGER REFERENCES legal_hierarchy(id),
    article_start INTEGER,
    article_end INTEGER,
    full_path TEXT, -- Ex: "Título V > Capítulo I > Seção II"
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, hierarchy_type, hierarchy_number)
);

-- ============================================================
-- LIMPAR DADOS ANTERIORES PARA EVITAR CONFLITOS
-- ============================================================

DELETE FROM legal_hierarchy WHERE document_type = 'LUOS';

-- ============================================================
-- TÍTULOS DA LUOS (10 títulos)
-- ============================================================

INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, article_start, article_end, order_index, full_path)
VALUES 
    ('LUOS', 'titulo', 'I', 'Das Disposições Gerais', 1, 4, 1, 'Título I'),
    ('LUOS', 'titulo', 'II', 'Das Zonas de Ordenamento Territorial', 5, 22, 2, 'Título II'),
    ('LUOS', 'titulo', 'III', 'Das Disposições Gerais sobre Parcelamento do Solo, Edificações e Regime Urbanístico', 23, 30, 3, 'Título III'),
    ('LUOS', 'titulo', 'IV', 'Das Estruturas de Planejamento Urbano', 31, 32, 4, 'Título IV'),
    ('LUOS', 'titulo', 'V', 'Do Parcelamento do Solo', 33, 64, 5, 'Título V'),
    ('LUOS', 'titulo', 'VI', 'Do Uso e da Ocupação do Solo', 65, 84, 6, 'Título VI'),
    ('LUOS', 'titulo', 'VII', 'Do Licenciamento Urbanístico e Edilício', 85, 89, 7, 'Título VII'),
    ('LUOS', 'titulo', 'VIII', 'Do Estudo de Impacto de Vizinhança', 90, 105, 8, 'Título VIII'),
    ('LUOS', 'titulo', 'IX', 'Da Outorga Onerosa do Direito de Construir', 106, 118, 9, 'Título IX'),
    ('LUOS', 'titulo', 'X', 'Das Disposições Finais e Transitórias', 119, 123, 10, 'Título X');

-- ============================================================
-- CAPÍTULOS DA LUOS (7 capítulos dentro do Título V e VI)
-- ============================================================

-- Capítulos do Título V (4 capítulos)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'capitulo',
    cap_num,
    cap_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'LUOS' AND hierarchy_type = 'titulo' AND hierarchy_number = 'V'),
    art_start,
    art_end,
    ord_idx,
    'Título V > Capítulo ' || cap_num
FROM (VALUES
    ('I', 'Do Loteamento', 46, 52, 1),
    ('II', 'Do Desmembramento', 53, 53, 2),
    ('III', 'Do Fracionamento', 54, 55, 3),
    ('IV', 'Do Procedimento de Aprovação do Parcelamento do Solo', 56, 64, 4)
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx);

-- Capítulos do Título VI (3 capítulos) - NUMERAÇÃO SEPARADA
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'capitulo',
    'VI-' || cap_num, -- Prefixo para evitar duplicação
    cap_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'LUOS' AND hierarchy_type = 'titulo' AND hierarchy_number = 'VI'),
    art_start,
    art_end,
    ord_idx,
    'Título VI > Capítulo ' || cap_num
FROM (VALUES
    ('I', 'Do Regime de Atividades', 67, 70, 5),
    ('II', 'Do Coeficiente de Aproveitamento', 71, 74, 6),
    ('III', 'Do Regime Volumétrico', 75, 84, 7)
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx);

-- ============================================================
-- SEÇÕES DA LUOS (5 seções dentro do Capítulo III do Título VI)
-- ============================================================

INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'secao',
    sec_num,
    sec_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'LUOS' AND hierarchy_type = 'capitulo' AND hierarchy_number = 'VI-III'),
    art_start,
    art_end,
    ord_idx,
    'Título VI > Capítulo III > Seção ' || sec_num
FROM (VALUES
    ('I', 'Da Taxa de Permeabilidade', 76, 79, 1),
    ('II', 'Da Referência de Nível', 80, 80, 2),
    ('III', 'Da Altura', 81, 81, 3),
    ('IV', 'Dos Recuos Laterais e de Fundos', 82, 82, 4),
    ('V', 'Do Recuo de Jardim', 83, 84, 5)
) AS sec(sec_num, sec_name, art_start, art_end, ord_idx);

-- ============================================================
-- CRIAR VIEW PARA NAVEGAÇÃO HIERÁRQUICA (CORRIGIDA)
-- ============================================================

DROP VIEW IF EXISTS luos_hierarchy_navigation CASCADE;

CREATE VIEW luos_hierarchy_navigation AS
WITH RECURSIVE hierarchy_tree AS (
    -- Nível raiz (títulos)
    SELECT 
        id,
        hierarchy_type,
        CASE 
            WHEN hierarchy_number LIKE 'VI-%' THEN SUBSTRING(hierarchy_number FROM 4)
            ELSE hierarchy_number
        END as display_number,
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
    WHERE document_type = 'LUOS' AND parent_id IS NULL
    
    UNION ALL
    
    -- Níveis filhos recursivos
    SELECT 
        h.id,
        h.hierarchy_type,
        CASE 
            WHEN h.hierarchy_number LIKE 'VI-%' THEN SUBSTRING(h.hierarchy_number FROM 4)
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
    WHERE h.document_type = 'LUOS'
)
SELECT 
    id,
    CASE hierarchy_type
        WHEN 'titulo' THEN 'TÍTULO'
        WHEN 'capitulo' THEN 'CAPÍTULO'
        WHEN 'secao' THEN 'SEÇÃO'
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
-- CRIAR FUNÇÃO PARA BUSCAR HIERARQUIA DE UM ARTIGO (CORRIGIDA)
-- ============================================================

DROP FUNCTION IF EXISTS get_article_hierarchy CASCADE;

CREATE FUNCTION get_article_hierarchy(
    p_document_type VARCHAR,
    p_article_number INTEGER
) RETURNS TABLE (
    hierarchy_level INTEGER,
    hierarchy_type VARCHAR,
    hierarchy_display TEXT,
    hierarchy_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE article_hierarchy AS (
        -- Encontrar hierarquia direta do artigo
        SELECT 
            h.id,
            h.hierarchy_type,
            CASE 
                WHEN h.hierarchy_number LIKE 'VI-%' THEN SUBSTRING(h.hierarchy_number FROM 4)
                ELSE h.hierarchy_number
            END as hierarchy_number,
            h.hierarchy_name,
            h.parent_id,
            1 as level
        FROM legal_hierarchy h
        WHERE h.document_type = p_document_type
            AND p_article_number BETWEEN h.article_start AND h.article_end
            AND h.hierarchy_type = (
                -- Pegar o nível mais específico
                SELECT hierarchy_type 
                FROM legal_hierarchy
                WHERE document_type = p_document_type
                    AND p_article_number BETWEEN article_start AND article_end
                ORDER BY 
                    CASE hierarchy_type
                        WHEN 'secao' THEN 1
                        WHEN 'capitulo' THEN 2
                        WHEN 'titulo' THEN 3
                        ELSE 4
                    END
                LIMIT 1
            )
        
        UNION ALL
        
        -- Subir na hierarquia
        SELECT 
            h.id,
            h.hierarchy_type,
            CASE 
                WHEN h.hierarchy_number LIKE 'VI-%' THEN SUBSTRING(h.hierarchy_number FROM 4)
                ELSE h.hierarchy_number
            END as hierarchy_number,
            h.hierarchy_name,
            h.parent_id,
            ah.level + 1
        FROM legal_hierarchy h
        JOIN article_hierarchy ah ON h.id = ah.parent_id
    )
    SELECT 
        (MAX(level) OVER() - level + 1) as hierarchy_level,
        hierarchy_type,
        CASE hierarchy_type
            WHEN 'titulo' THEN 'TÍTULO'
            WHEN 'capitulo' THEN 'CAPÍTULO'
            WHEN 'secao' THEN 'SEÇÃO'
            ELSE UPPER(hierarchy_type)
        END || ' ' || hierarchy_number as hierarchy_display,
        hierarchy_name
    FROM article_hierarchy
    ORDER BY hierarchy_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TESTES DE VALIDAÇÃO
-- ============================================================

-- Teste 1: Verificar estrutura completa
SELECT 
    hierarchy_type,
    COUNT(*) as total,
    STRING_AGG(
        CASE 
            WHEN hierarchy_number LIKE 'VI-%' THEN SUBSTRING(hierarchy_number FROM 4)
            ELSE hierarchy_number
        END, ', ' ORDER BY order_index
    ) as numbers
FROM legal_hierarchy
WHERE document_type = 'LUOS'
GROUP BY hierarchy_type
ORDER BY 
    CASE hierarchy_type
        WHEN 'titulo' THEN 1
        WHEN 'capitulo' THEN 2
        WHEN 'secao' THEN 3
        ELSE 4
    END;

-- Teste 2: Verificar hierarquia do Art. 77 (deve estar em Título VI > Capítulo III > Seção I)
SELECT * FROM get_article_hierarchy('LUOS', 77);

-- Teste 3: Visualizar árvore completa
SELECT 
    REPEAT('  ', level - 1) || display_text || ' - ' || hierarchy_name as estrutura,
    article_range
FROM luos_hierarchy_navigation
ORDER BY path_array
LIMIT 25;