-- Verificar tabela document_metadata
SELECT 
    id as dataset_id,
    title,
    schema,
    created_at
FROM document_metadata
ORDER BY created_at DESC;

-- Verificar se os datasets esperados existem
SELECT 
    id,
    title,
    schema
FROM document_metadata
WHERE id IN (
    '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
);

-- Verificar estrutura do schema
SELECT 
    id,
    title,
    jsonb_array_elements_text(schema) as column_name
FROM document_metadata
WHERE id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk';