-- ============================================================
-- ESTRUTURA HIERÁRQUICA COMPLETA - PDUS + LUOS
-- Inclui: Partes, Títulos, Capítulos, Seções, Subseções
-- Execute este script diretamente no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PARTE 1: DADOS DO PDUS (PLANO DIRETOR)
-- ============================================================

-- Inserir PARTES do PDUS
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, article_start, article_end, order_index, full_path)
VALUES 
    ('PDUS', 'parte', 'I', 'Plano Estratégico', 1, 115, 1, 'Parte I'),
    ('PDUS', 'parte', 'II', 'Planejamento, Gestão e Execução da Política Urbana', 116, 208, 2, 'Parte II'),
    ('PDUS', 'parte', 'III', 'Disposições Finais e Transitórias', 209, 217, 3, 'Parte III')
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- Inserir TÍTULOS do PDUS - Parte I
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'titulo',
    tit_num,
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
) AS tit(tit_num, tit_name, art_start, art_end, ord_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- Inserir TÍTULOS do PDUS - Parte II
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'PDUS',
    'titulo',
    'P2-' || tit_num,
    tit_name,
    (SELECT id FROM legal_hierarchy WHERE document_type = 'PDUS' AND hierarchy_type = 'parte' AND hierarchy_number = 'II'),
    art_start,
    art_end,
    ord_idx,
    'Parte II > Título ' || tit_num
FROM (VALUES
    ('I', 'Do Sistema de Gestão, Controle, Planejamento e Financiamento Urbano', 116, 139, 5),
    ('II', 'Dos Instrumentos Urbanísticos', 140, 208, 6)
) AS tit(tit_num, tit_name, art_start, art_end, ord_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- ============================================================
-- PARTE 2: CAPÍTULOS E SEÇÕES DA LUOS
-- ============================================================

-- Capítulos do Título V da LUOS (Parcelamento do Solo)
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
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- Capítulos do Título VI da LUOS (Uso e Ocupação)
INSERT INTO legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, parent_id, article_start, article_end, order_index, full_path)
SELECT 
    'LUOS',
    'capitulo',
    'VI-' || cap_num,
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
) AS cap(cap_num, cap_name, art_start, art_end, ord_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- Seções do Capítulo III do Título VI (Regime Volumétrico)
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
) AS sec(sec_num, sec_name, art_start, art_end, ord_idx)
ON CONFLICT (document_type, hierarchy_type, hierarchy_number) DO NOTHING;

-- ============================================================
-- PARTE 3: CRIAR TABELA PARA METADADOS DE ARTIGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS article_metadata (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    article_number INTEGER NOT NULL,
    has_paragraphs BOOLEAN DEFAULT FALSE,
    has_incisos BOOLEAN DEFAULT FALSE,
    has_alineas BOOLEAN DEFAULT FALSE,
    paragraph_count INTEGER DEFAULT 0,
    inciso_count INTEGER DEFAULT 0,
    alinea_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, article_number)
);

-- ============================================================
-- PARTE 4: FUNÇÃO MELHORADA PARA BUSCAR HIERARQUIA COMPLETA
-- ============================================================

CREATE OR REPLACE FUNCTION get_complete_hierarchy(doc_type VARCHAR, art_num INTEGER)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    rec RECORD;
BEGIN
    -- Buscar toda a hierarquia do artigo
    FOR rec IN 
        SELECT 
            hierarchy_type,
            hierarchy_number,
            hierarchy_name,
            CASE hierarchy_type
                WHEN 'parte' THEN 1
                WHEN 'titulo' THEN 2
                WHEN 'capitulo' THEN 3
                WHEN 'secao' THEN 4
                WHEN 'subsecao' THEN 5
                ELSE 6
            END as level_order
        FROM legal_hierarchy
        WHERE document_type = doc_type
            AND art_num BETWEEN article_start AND article_end
        ORDER BY level_order
    LOOP
        IF result != '' THEN
            result := result || ' > ';
        END IF;
        
        result := result || 
            CASE rec.hierarchy_type
                WHEN 'parte' THEN 'PARTE'
                WHEN 'titulo' THEN 'TÍTULO'
                WHEN 'capitulo' THEN 'CAPÍTULO'
                WHEN 'secao' THEN 'SEÇÃO'
                WHEN 'subsecao' THEN 'SUBSEÇÃO'
                ELSE UPPER(rec.hierarchy_type)
            END || ' ' || 
            CASE 
                WHEN rec.hierarchy_number LIKE 'VI-%' THEN SUBSTRING(rec.hierarchy_number FROM 4)
                WHEN rec.hierarchy_number LIKE 'P%-%' THEN 
                    SUBSTRING(rec.hierarchy_number FROM POSITION('-' IN rec.hierarchy_number) + 1)
                ELSE rec.hierarchy_number
            END || ' - ' || rec.hierarchy_name;
    END LOOP;
    
    -- Adicionar o artigo
    IF result != '' THEN
        result := result || ' > ';
    END IF;
    result := result || 'Art. ' || art_num || 'º';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTE 5: TESTES DE VALIDAÇÃO
-- ============================================================

-- Teste 1: Verificar estrutura completa
SELECT 
    document_type,
    hierarchy_type,
    COUNT(*) as total
FROM legal_hierarchy
GROUP BY document_type, hierarchy_type
ORDER BY document_type, 
    CASE hierarchy_type
        WHEN 'parte' THEN 1
        WHEN 'titulo' THEN 2
        WHEN 'capitulo' THEN 3
        WHEN 'secao' THEN 4
        WHEN 'subsecao' THEN 5
        ELSE 6
    END;

-- Teste 2: Verificar hierarquia completa de artigos específicos
SELECT 
    'Art. 119 LUOS' as teste,
    get_complete_hierarchy('LUOS', 119) as hierarquia
UNION ALL
SELECT 
    'Art. 77 LUOS',
    get_complete_hierarchy('LUOS', 77)
UNION ALL
SELECT 
    'Art. 1 PDUS',
    get_complete_hierarchy('PDUS', 1)
UNION ALL
SELECT 
    'Art. 4 LUOS',
    get_complete_hierarchy('LUOS', 4);

-- Teste 3: Contar total de elementos
SELECT 
    'Total LUOS' as documento,
    COUNT(*) as elementos
FROM legal_hierarchy
WHERE document_type = 'LUOS'
UNION ALL
SELECT 
    'Total PDUS',
    COUNT(*)
FROM legal_hierarchy
WHERE document_type = 'PDUS';

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================
SELECT 
    '✅ Script executado com sucesso!' as status,
    'Hierarquia completa criada para LUOS e PDUS' as mensagem;