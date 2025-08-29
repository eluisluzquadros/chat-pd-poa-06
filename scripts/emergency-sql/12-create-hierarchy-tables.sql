-- ============================================================
-- CRIAÇÃO EMERGENCIAL DAS TABELAS DE HIERARQUIA
-- Execute este script diretamente no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela de hierarquia
CREATE TABLE IF NOT EXISTS legal_hierarchy (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    hierarchy_type VARCHAR(20) NOT NULL,
    hierarchy_number VARCHAR(20) NOT NULL,
    hierarchy_name TEXT NOT NULL,
    parent_id INTEGER REFERENCES legal_hierarchy(id),
    article_start INTEGER,
    article_end INTEGER,
    full_path TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, hierarchy_type, hierarchy_number)
);

-- 2. Limpar dados anteriores
DELETE FROM legal_hierarchy;

-- 3. Inserir títulos da LUOS
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

-- 4. Verificar inserção
SELECT COUNT(*) as total_titulos FROM legal_hierarchy WHERE document_type = 'LUOS';

-- 5. Criar função simples para buscar hierarquia
CREATE OR REPLACE FUNCTION get_article_context(doc_type VARCHAR, art_num INTEGER)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT 
        'Artigo ' || art_num || ' está em: ' || 
        hierarchy_type || ' ' || hierarchy_number || ' - ' || hierarchy_name
    INTO result
    FROM legal_hierarchy
    WHERE document_type = doc_type
        AND art_num BETWEEN article_start AND article_end
    ORDER BY 
        CASE hierarchy_type
            WHEN 'secao' THEN 1
            WHEN 'capitulo' THEN 2
            WHEN 'titulo' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    RETURN COALESCE(result, 'Artigo não encontrado na hierarquia');
END;
$$ LANGUAGE plpgsql;

-- 6. Testar função
SELECT get_article_context('LUOS', 119) as contexto_art_119;
SELECT get_article_context('LUOS', 75) as contexto_art_75;
SELECT get_article_context('LUOS', 1) as contexto_art_1;