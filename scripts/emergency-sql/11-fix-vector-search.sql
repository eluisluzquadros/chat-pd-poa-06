-- =====================================================
-- CORRIGIR BUSCA VETORIAL PARA USAR EMBEDDINGS EXISTENTES
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Como temos dados em document_embeddings mas não em document_chunks,
-- vamos fazer a função match_documents buscar em document_embeddings

-- 1. Recriar função match_documents para usar document_embeddings
DROP FUNCTION IF EXISTS match_documents(vector, float, int);

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
    -- Primeiro tentar em document_chunks
    IF EXISTS (SELECT 1 FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1) THEN
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
    -- Se não houver, buscar em document_embeddings
    ELSE
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
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar função auxiliar para buscar conteúdo por similaridade
CREATE OR REPLACE FUNCTION search_content_by_similarity(
    search_query text,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    content text,
    similarity float,
    document_id bigint
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.content_chunk as content,
        1.0 as similarity, -- Placeholder, seria calculado com embedding real
        de.document_id
    FROM document_embeddings de
    WHERE de.content_chunk ILIKE '%' || search_query || '%'
    ORDER BY length(de.content_chunk)
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Verificar dados disponíveis
SELECT 
    'VERIFICAÇÃO DE DADOS:' as info;

SELECT 
    'document_embeddings' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
    COUNT(DISTINCT document_id) as unique_documents
FROM document_embeddings

UNION ALL

SELECT 
    'document_chunks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
    COUNT(DISTINCT document_id) as unique_documents
FROM document_chunks;

-- 4. Testar busca simples
SELECT 
    'TESTE DE BUSCA:' as info;

SELECT 
    id,
    document_id,
    LEFT(content_chunk, 100) || '...' as content_preview
FROM document_embeddings
WHERE content_chunk ILIKE '%plano diretor%'
LIMIT 3;