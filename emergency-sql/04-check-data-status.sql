-- FASE 2.1: Verificar estado atual dos dados
-- Execute este script para entender o que precisa ser importado

-- Primeiro, verificar se as tabelas existem
SELECT 
    required_tables.table_name,
    CASE 
        WHEN ist.table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (
    VALUES 
        ('documents'),
        ('document_chunks'),
        ('document_embeddings'),
        ('document_rows'),
        ('regime_urbanistico'),
        ('query_cache'),
        ('user_feedback'),
        ('secrets')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables ist 
    ON ist.table_name = required_tables.table_name 
    AND ist.table_schema = 'public'
ORDER BY required_tables.table_name;

-- Se todas as tabelas existirem, execute o resumo abaixo:
-- Resumo geral de todas as tabelas importantes
SELECT 
    'documents' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT file_name) as unique_files
FROM documents
UNION ALL
SELECT 
    'document_chunks' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT document_id) as unique_documents
FROM document_chunks
UNION ALL
SELECT 
    'document_rows' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT document_id) as unique_documents
FROM document_rows
UNION ALL
SELECT 
    'regime_urbanistico' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT bairro) as unique_bairros
FROM regime_urbanistico
UNION ALL
SELECT 
    'query_cache' as table_name, 
    COUNT(*) as record_count,
    0 as unique_items
FROM query_cache
UNION ALL
SELECT 
    'user_feedback' as table_name, 
    COUNT(*) as record_count,
    0 as unique_items
FROM user_feedback
ORDER BY table_name;

-- Detalhes dos documentos existentes
SELECT 
    id,
    file_name,
    file_type,
    chunk_count,
    processing_status,
    created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;

-- Verificar se há embeddings
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embedding,
    COUNT(DISTINCT document_id) as total_documents
FROM document_chunks;

-- Verificar dados de regime urbanístico
SELECT 
    COUNT(DISTINCT bairro) as total_bairros,
    COUNT(*) as total_registros,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro
FROM regime_urbanistico;

-- Listar bairros com dados
SELECT 
    bairro,
    COUNT(*) as registros_por_bairro
FROM regime_urbanistico
GROUP BY bairro
ORDER BY bairro
LIMIT 20;