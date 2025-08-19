-- ============================================================
-- SISTEMA DE NAVEGAÇÃO HIERÁRQUICA COMPLETO
-- Com breadcrumbs, navegação anterior/próximo e índice
-- ============================================================

-- ============================================================
-- FUNÇÃO: NAVEGAÇÃO BREADCRUMB
-- ============================================================

CREATE OR REPLACE FUNCTION get_breadcrumb(
    p_document_type VARCHAR,
    p_article_number INTEGER
) RETURNS TEXT AS $$
DECLARE
    v_breadcrumb TEXT := '';
    v_hierarchy RECORD;
BEGIN
    -- Construir breadcrumb do artigo
    FOR v_hierarchy IN (
        SELECT * FROM get_article_hierarchy(p_document_type, p_article_number)
        ORDER BY hierarchy_level
    )
    LOOP
        IF v_breadcrumb != '' THEN
            v_breadcrumb := v_breadcrumb || ' > ';
        END IF;
        v_breadcrumb := v_breadcrumb || v_hierarchy.hierarchy_display;
    END LOOP;
    
    -- Adicionar o artigo no final
    v_breadcrumb := v_breadcrumb || ' > Art. ' || p_article_number || 'º';
    
    RETURN v_breadcrumb;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: NAVEGAÇÃO ANTERIOR/PRÓXIMO
-- ============================================================

CREATE OR REPLACE FUNCTION get_article_navigation(
    p_document_type VARCHAR,
    p_article_number INTEGER
) RETURNS TABLE (
    prev_article INTEGER,
    prev_title TEXT,
    next_article INTEGER,
    next_title TEXT,
    current_hierarchy TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH nav_context AS (
        SELECT 
            p_article_number as current_art,
            LAG(article_number) OVER (ORDER BY article_number) as prev_art,
            LEAD(article_number) OVER (ORDER BY article_number) as next_art
        FROM legal_articles
        WHERE document_type = p_document_type
            AND article_number != 4 -- Pular lacunas conhecidas se ainda existirem
    )
    SELECT 
        nc.prev_art as prev_article,
        COALESCE(LEFT(lap.article_text, 50) || '...', '') as prev_title,
        nc.next_art as next_article,
        COALESCE(LEFT(lan.article_text, 50) || '...', '') as next_title,
        get_breadcrumb(p_document_type, p_article_number) as current_hierarchy
    FROM nav_context nc
    LEFT JOIN legal_articles lap 
        ON lap.document_type = p_document_type 
        AND lap.article_number = nc.prev_art
    LEFT JOIN legal_articles lan 
        ON lan.document_type = p_document_type 
        AND lan.article_number = nc.next_art
    WHERE nc.current_art = p_article_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEW: ÍNDICE NAVEGÁVEL COMPLETO
-- ============================================================

CREATE OR REPLACE VIEW indice_navegavel AS
WITH RECURSIVE full_hierarchy AS (
    -- Raiz dos documentos
    SELECT 
        document_type,
        NULL::INTEGER as parent_id,
        id,
        hierarchy_type,
        hierarchy_number,
        hierarchy_name,
        article_start,
        article_end,
        order_index,
        0 as level,
        ARRAY[order_index] as path
    FROM legal_hierarchy
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Elementos filhos
    SELECT 
        h.document_type,
        h.parent_id,
        h.id,
        h.hierarchy_type,
        h.hierarchy_number,
        h.hierarchy_name,
        h.article_start,
        h.article_end,
        h.order_index,
        fh.level + 1,
        fh.path || h.order_index
    FROM legal_hierarchy h
    JOIN full_hierarchy fh ON h.parent_id = fh.id
),
articles_list AS (
    -- Adicionar artigos como folhas da árvore
    SELECT 
        la.document_type,
        h.id as parent_id,
        -la.article_number as id, -- ID negativo para diferenciar de hierarquia
        'artigo' as hierarchy_type,
        la.article_number::TEXT as hierarchy_number,
        LEFT(la.article_text, 100) as hierarchy_name,
        la.article_number as article_start,
        la.article_number as article_end,
        la.article_number as order_index,
        h.level + 1 as level,
        h.path || la.article_number as path
    FROM legal_articles la
    JOIN full_hierarchy h ON 
        la.document_type = h.document_type
        AND la.article_number BETWEEN h.article_start AND h.article_end
        AND NOT EXISTS (
            -- Não incluir se há um nível mais específico
            SELECT 1 FROM full_hierarchy h2
            WHERE h2.document_type = la.document_type
                AND la.article_number BETWEEN h2.article_start AND h2.article_end
                AND h2.level > h.level
        )
)
SELECT 
    document_type,
    id,
    parent_id,
    REPEAT('  ', level) || 
    CASE hierarchy_type
        WHEN 'parte' THEN '📚 PARTE ' || hierarchy_number
        WHEN 'titulo' THEN '📖 TÍTULO ' || hierarchy_number
        WHEN 'capitulo' THEN '📑 CAPÍTULO ' || hierarchy_number
        WHEN 'secao' THEN '📄 SEÇÃO ' || hierarchy_number
        WHEN 'subsecao' THEN '📃 SUBSEÇÃO ' || hierarchy_number
        WHEN 'artigo' THEN '📝 Art. ' || hierarchy_number || 'º'
        ELSE hierarchy_type || ' ' || hierarchy_number
    END as display_text,
    hierarchy_name as description,
    CASE 
        WHEN hierarchy_type = 'artigo' THEN 'Art. ' || hierarchy_number || 'º'
        WHEN article_start = article_end THEN 'Art. ' || article_start || 'º'
        WHEN article_start IS NOT NULL THEN 'Arts. ' || article_start || 'º-' || article_end || 'º'
        ELSE ''
    END as article_range,
    level,
    path,
    hierarchy_type,
    hierarchy_number,
    article_start,
    article_end
FROM (
    SELECT * FROM full_hierarchy
    UNION ALL
    SELECT * FROM articles_list
) combined
ORDER BY document_type, path;

-- ============================================================
-- TABELA: METADADOS ESTRUTURADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS article_metadata (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    article_number INTEGER NOT NULL,
    paragraphs JSONB, -- {"§1": "texto", "§2": "texto"}
    incisos JSONB,    -- {"I": "texto", "II": "texto"}
    alineas JSONB,    -- {"a": "texto", "b": "texto"}
    cross_references INTEGER[], -- Artigos referenciados
    modified_by INTEGER[], -- Artigos que modificam este
    modifies INTEGER[], -- Artigos que este modifica
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, article_number)
);

-- ============================================================
-- FUNÇÃO: EXTRAIR METADADOS DE ARTIGO
-- ============================================================

CREATE OR REPLACE FUNCTION extract_article_metadata(
    p_document_type VARCHAR,
    p_article_number INTEGER
) RETURNS VOID AS $$
DECLARE
    v_content TEXT;
    v_paragraphs JSONB := '{}';
    v_incisos JSONB := '{}';
    v_alineas JSONB := '{}';
    v_cross_refs INTEGER[] := '{}';
BEGIN
    -- Obter conteúdo do artigo
    SELECT full_content INTO v_content
    FROM legal_articles
    WHERE document_type = p_document_type AND article_number = p_article_number;
    
    IF v_content IS NULL THEN
        RETURN;
    END IF;
    
    -- Extrair parágrafos (§ 1º, § 2º, etc.)
    -- Simplificado - em produção usar regex mais robusta
    IF v_content LIKE '%§%' THEN
        -- Lógica de extração de parágrafos
        v_paragraphs := '{"info": "Parágrafos detectados mas não parseados"}';
    END IF;
    
    -- Extrair incisos (I, II, III, etc.)
    IF v_content ~ '\s+I\s+-' THEN
        -- Lógica de extração de incisos
        v_incisos := '{"info": "Incisos detectados mas não parseados"}';
    END IF;
    
    -- Extrair alíneas (a), b), c), etc.)
    IF v_content ~ '\s+[a-z]\)' THEN
        -- Lógica de extração de alíneas
        v_alineas := '{"info": "Alíneas detectadas mas não parseadas"}';
    END IF;
    
    -- Extrair referências cruzadas (Art. X, Arts. Y e Z)
    -- Buscar padrões como "Art. 123" ou "Arts. 45 e 67"
    v_cross_refs := ARRAY(
        SELECT DISTINCT (regexp_matches(v_content, 'Art\.\s*(\d+)', 'g'))[1]::INTEGER
        WHERE (regexp_matches(v_content, 'Art\.\s*(\d+)', 'g'))[1]::INTEGER != p_article_number
    );
    
    -- Inserir ou atualizar metadados
    INSERT INTO article_metadata (
        document_type,
        article_number,
        paragraphs,
        incisos,
        alineas,
        cross_references
    ) VALUES (
        p_document_type,
        p_article_number,
        v_paragraphs,
        v_incisos,
        v_alineas,
        v_cross_refs
    ) ON CONFLICT (document_type, article_number) 
    DO UPDATE SET
        paragraphs = EXCLUDED.paragraphs,
        incisos = EXCLUDED.incisos,
        alineas = EXCLUDED.alineas,
        cross_references = EXCLUDED.cross_references,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEW: ARTIGOS COM NAVEGAÇÃO COMPLETA
-- ============================================================

CREATE OR REPLACE VIEW articles_with_navigation AS
SELECT 
    la.document_type,
    la.article_number,
    la.article_text,
    la.full_content,
    la.keywords,
    get_breadcrumb(la.document_type, la.article_number) as breadcrumb,
    nav.prev_article,
    nav.prev_title,
    nav.next_article,
    nav.next_title,
    am.paragraphs,
    am.incisos,
    am.alineas,
    am.cross_references,
    ARRAY(
        SELECT DISTINCT a.anexo_number 
        FROM article_anexo_references aar
        JOIN legal_anexos a ON aar.anexo_id = a.id
        WHERE aar.document_type = la.document_type 
            AND aar.article_number = la.article_number
    ) as related_anexos
FROM legal_articles la
LEFT JOIN LATERAL get_article_navigation(la.document_type, la.article_number) nav ON true
LEFT JOIN article_metadata am ON 
    am.document_type = la.document_type 
    AND am.article_number = la.article_number;

-- ============================================================
-- TESTES DE NAVEGAÇÃO
-- ============================================================

-- Teste 1: Breadcrumb do Art. 77 LUOS
SELECT get_breadcrumb('LUOS', 77) as breadcrumb;

-- Teste 2: Navegação anterior/próximo do Art. 50 LUOS
SELECT * FROM get_article_navigation('LUOS', 50);

-- Teste 3: Visualizar índice navegável (primeiros 20 itens)
SELECT 
    display_text,
    description,
    article_range
FROM indice_navegavel
WHERE document_type = 'LUOS'
ORDER BY path
LIMIT 20;

-- Teste 4: Artigo com navegação completa
SELECT 
    article_number,
    LEFT(article_text, 50) || '...' as preview,
    breadcrumb,
    prev_article,
    next_article,
    array_length(cross_references, 1) as total_references,
    array_length(related_anexos, 1) as total_anexos
FROM articles_with_navigation
WHERE document_type = 'LUOS' 
    AND article_number = 77;