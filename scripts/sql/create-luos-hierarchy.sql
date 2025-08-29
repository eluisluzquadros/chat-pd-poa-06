-- ============================================================
-- ESTRUTURA HIERÁRQUICA COMPLETA DA LUOS
-- Baseada no índice ABNT oficial
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
    ('LUOS', 'titulo', 'X', 'Das Disposições Finais e Transitórias', 119, 123, 10, 'Título X')
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- CAPÍTULOS DA LUOS (7 capítulos dentro do Título V e VI)
-- ============================================================

-- Obter IDs dos títulos pai
WITH titulo_ids AS (
    SELECT id, hierarchy_number 
    FROM legal_hierarchy 
    WHERE document_type = 'LUOS' AND hierarchy_type = 'titulo'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'capitulo',
    cap.number,
    cap.name,
    t.id,
    cap.art_start,
    cap.art_end,
    cap.order_idx,
    'Título ' || t.hierarchy_number || ' > Capítulo ' || cap.number
FROM titulo_ids t
JOIN (VALUES
    -- Capítulos do Título V
    ('V', 'I', 'Do Loteamento', 46, 52, 1),
    ('V', 'II', 'Do Desmembramento', 53, 53, 2),
    ('V', 'III', 'Do Fracionamento', 54, 55, 3),
    ('V', 'IV', 'Do Procedimento de Aprovação do Parcelamento do Solo', 56, 64, 4),
    -- Capítulos do Título VI
    ('VI', 'I', 'Do Regime de Atividades', 67, 70, 5),
    ('VI', 'II', 'Do Coeficiente de Aproveitamento', 71, 74, 6),
    ('VI', 'III', 'Do Regime Volumétrico', 75, 84, 7)
) AS cap(titulo_num, number, name, art_start, art_end, order_idx)
ON t.hierarchy_number = cap.titulo_num
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- SEÇÕES DA LUOS (5 seções dentro do Capítulo III do Título VI)
-- ============================================================

-- Obter ID do Capítulo III do Título VI
WITH capitulo_parent AS (
    SELECT h.id 
    FROM legal_hierarchy h
    JOIN legal_hierarchy t ON h.parent_id = t.id
    WHERE h.document_type = 'LUOS' 
        AND h.hierarchy_type = 'capitulo' 
        AND h.hierarchy_number = 'III'
        AND t.hierarchy_number = 'VI'
)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'secao',
    sec.number,
    sec.name,
    cp.id,
    sec.art_start,
    sec.art_end,
    sec.order_idx,
    'Título VI > Capítulo III > Seção ' || sec.number
FROM capitulo_parent cp
CROSS JOIN (VALUES
    ('I', 'Da Taxa de Permeabilidade', 76, 79, 1),
    ('II', 'Da Referência de Nível', 80, 80, 2),
    ('III', 'Da Altura', 81, 81, 3),
    ('IV', 'Dos Recuos Laterais e de Fundos', 82, 82, 4),
    ('V', 'Do Recuo de Jardim', 83, 84, 5)
) AS sec(number, name, art_start, art_end, order_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO UPDATE
SET 
    hierarchy_name = EXCLUDED.hierarchy_name,
    parent_id = EXCLUDED.parent_id,
    article_start = EXCLUDED.article_start,
    article_end = EXCLUDED.article_end;

-- ============================================================
-- CRIAR VIEW PARA NAVEGAÇÃO HIERÁRQUICA
-- ============================================================

CREATE OR REPLACE VIEW luos_hierarchy_navigation AS
WITH RECURSIVE hierarchy_tree AS (
    -- Nível raiz (títulos)
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
    WHERE document_type = 'LUOS' AND parent_id IS NULL
    
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
    WHERE h.document_type = 'LUOS'
)
SELECT 
    id,
    CASE hierarchy_type
        WHEN 'titulo' THEN 'TÍTULO'
        WHEN 'capitulo' THEN 'CAPÍTULO'
        WHEN 'secao' THEN 'SEÇÃO'
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
-- CRIAR FUNÇÃO PARA BUSCAR HIERARQUIA DE UM ARTIGO
-- ============================================================

CREATE OR REPLACE FUNCTION get_article_hierarchy(
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
            h.hierarchy_number,
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
            h.hierarchy_number,
            h.hierarchy_name,
            h.parent_id,
            ah.level + 1
        FROM legal_hierarchy h
        JOIN article_hierarchy ah ON h.id = ah.parent_id
    )
    SELECT 
        (MAX(level) - level + 1) as hierarchy_level,
        hierarchy_type,
        CASE hierarchy_type
            WHEN 'titulo' THEN 'TÍTULO'
            WHEN 'capitulo' THEN 'CAPÍTULO'
            WHEN 'secao' THEN 'SEÇÃO'
            ELSE UPPER(hierarchy_type)
        END || ' ' || hierarchy_number as hierarchy_display,
        hierarchy_name
    FROM article_hierarchy
    GROUP BY hierarchy_type, hierarchy_number, hierarchy_name, level
    ORDER BY hierarchy_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TESTES DE VALIDAÇÃO
-- ============================================================

-- Teste 1: Verificar estrutura completa
SELECT 
    hierarchy_type,
    COUNT(*) as total
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
    REPEAT('  ', level - 1) || display_number || ' - ' || hierarchy_name as estrutura,
    article_range
FROM luos_hierarchy_navigation
ORDER BY path_array;