-- Check current embeddings status
SELECT 
    d.id as document_id,
    d.title,
    d.type,
    d.is_processed,
    COUNT(de.id) as chunks_count,
    COUNT(CASE WHEN de.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
    AVG(array_length(de.embedding, 1)) as avg_embedding_dimension
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
GROUP BY d.id, d.title, d.type, d.is_processed
ORDER BY d.id;

-- Check embedding quality
SELECT 
    de.document_id,
    de.chunk_index,
    LENGTH(de.content_chunk) as chunk_length,
    array_length(de.embedding, 1) as embedding_dimension,
    CASE 
        WHEN de.embedding IS NULL THEN 'NULL'
        WHEN array_length(de.embedding, 1) = 1536 THEN 'text-embedding-3-small'
        WHEN array_length(de.embedding, 1) = 3072 THEN 'text-embedding-3-large'
        WHEN array_length(de.embedding, 1) = 1024 THEN 'text-embedding-ada-002'
        ELSE 'unknown'
    END as embedding_model,
    de.priority_score,
    array_length(de.keywords, 1) as keywords_count
FROM document_embeddings de
ORDER BY de.document_id, de.chunk_index
LIMIT 20;