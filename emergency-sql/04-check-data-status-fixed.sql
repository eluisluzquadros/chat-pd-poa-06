-- FASE 2.1: Verificar estado atual dos dados
-- Execute este script para entender o que precisa ser importado

-- Verificar quais tabelas existem
SELECT 
    rt.table_name as required_table,
    CASE 
        WHEN ist.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('documents'),
        ('document_chunks'),
        ('document_rows'),
        ('regime_urbanistico'),
        ('query_cache'),
        ('user_feedback'),
        ('secrets')
) AS rt(table_name)
LEFT JOIN information_schema.tables ist 
    ON ist.table_name = rt.table_name 
    AND ist.table_schema = 'public'
ORDER BY rt.table_name;

-- Contar registros em cada tabela (executar separadamente se preferir)
SELECT 'documents' as tabela, COUNT(*) as total FROM documents
UNION ALL
SELECT 'document_chunks', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'document_rows', COUNT(*) FROM document_rows
UNION ALL
SELECT 'regime_urbanistico', COUNT(*) FROM regime_urbanistico
UNION ALL
SELECT 'query_cache', COUNT(*) FROM query_cache
UNION ALL
SELECT 'secrets', COUNT(*) FROM secrets
ORDER BY tabela;

-- Verificar detalhes dos documentos
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

-- Verificar se há chunks com embeddings
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ Nenhum chunk encontrado'
        WHEN COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) = 0 THEN '⚠️ Chunks sem embeddings'
        ELSE '✅ Chunks com embeddings: ' || COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END)::TEXT
    END as status_chunks
FROM document_chunks;

-- Verificar dados do regime urbanístico
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ Nenhum dado de regime urbanístico'
        ELSE '✅ Total de registros: ' || COUNT(*)::TEXT || ' | Bairros únicos: ' || COUNT(DISTINCT bairro)::TEXT
    END as status_regime
FROM regime_urbanistico;

-- Verificar se há cache ativo
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ Cache vazio'
        ELSE '✅ Entradas no cache: ' || COUNT(*)::TEXT
    END as status_cache
FROM query_cache
WHERE expires_at IS NULL OR expires_at > NOW();