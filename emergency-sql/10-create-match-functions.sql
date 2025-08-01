-- =====================================================
-- CRIAR FUNÇÕES DE BUSCA VETORIAL
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Função match_documents (para document_chunks)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    document_id bigint,
    content text,
    similarity float
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Função match_embeddings (para document_embeddings)
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    document_id bigint,
    content text,
    similarity float
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.document_id,
        de.content_chunk as content,
        1 - (de.embedding <=> query_embedding) as similarity
    FROM document_embeddings de
    WHERE de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para buscar no regime urbanístico
CREATE OR REPLACE FUNCTION search_regime_urbanistico(
    search_bairro text DEFAULT NULL,
    search_zona text DEFAULT NULL
)
RETURNS TABLE (
    id int,
    bairro text,
    zona text,
    altura_maxima decimal,
    coef_aproveitamento_basico decimal,
    coef_aproveitamento_maximo decimal,
    area_minima_lote decimal,
    testada_minima_lote decimal
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.bairro,
        r.zona,
        r.altura_maxima,
        r.coef_aproveitamento_basico,
        r.coef_aproveitamento_maximo,
        r.area_minima_lote,
        r.testada_minima_lote
    FROM regime_urbanistico r
    WHERE 
        (search_bairro IS NULL OR r.bairro ILIKE '%' || search_bairro || '%')
        AND (search_zona IS NULL OR r.zona ILIKE '%' || search_zona || '%')
    ORDER BY r.bairro, r.zona;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para buscar ZOTs por bairro
CREATE OR REPLACE FUNCTION search_zots_by_bairro(
    search_bairro text
)
RETURNS TABLE (
    bairro text,
    zona text,
    total_zonas_no_bairro int,
    tem_zona_especial varchar
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.bairro,
        z.zona,
        z.total_zonas_no_bairro,
        z.tem_zona_especial
    FROM zots_bairros z
    WHERE z.bairro ILIKE '%' || search_bairro || '%'
    ORDER BY z.zona;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar criação das funções
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'match_documents',
    'match_embeddings',
    'search_regime_urbanistico',
    'search_zots_by_bairro'
)
ORDER BY routine_name;