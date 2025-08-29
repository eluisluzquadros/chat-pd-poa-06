-- Verificar tipo da coluna embedding
SELECT 
    column_name,
    data_type,
    udt_name,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
  AND column_name = 'embedding';

-- Verificar se pgvector está instalado
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Se a coluna não for do tipo vector, precisamos alterar:
-- ALTER TABLE document_sections 
-- ALTER COLUMN embedding TYPE vector(1536) 
-- USING embedding::vector(1536);