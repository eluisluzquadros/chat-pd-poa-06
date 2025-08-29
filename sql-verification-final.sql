-- VERIFICAÇÃO FINAL
-- Execute após todas as partes

-- Contar total de chunks
SELECT 
  d.name,
  d.status,
  COUNT(de.id) as total_chunks,
  MIN(de.chunk_index) as first_chunk,
  MAX(de.chunk_index) as last_chunk
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
WHERE d.id = '30014c0a-3b55-42a2-a22c-e8f4090d5591'
GROUP BY d.id, d.name, d.status;

-- Verificar chunks sobre altura
SELECT 
  chunk_index,
  content_preview,
  metadata->>'keywords' as keywords
FROM document_embeddings
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591'
  AND (
    content ILIKE '%altura%' OR
    content ILIKE '%gabarito%' OR
    metadata->>'keywords' LIKE '%altura%'
  )
ORDER BY chunk_index
LIMIT 5;

-- Estatísticas gerais
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(DISTINCT document_id) as total_documents,
  MAX(chunk_index) + 1 as max_chunks_per_doc
FROM document_embeddings;