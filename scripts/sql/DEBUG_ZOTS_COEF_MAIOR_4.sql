-- Debug: Verificar ZOTs com coeficiente > 4

-- 1. Listar todas as ZOTs e seus coeficientes máximos
SELECT DISTINCT
    row_data->>'Zona' as zona,
    (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND row_data->>'Coeficiente de Aproveitamento - Máximo' IS NOT NULL
ORDER BY (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric DESC;

-- 2. Filtrar apenas ZOTs com coeficiente > 4
SELECT DISTINCT
    row_data->>'Zona' as zona,
    (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > 4
ORDER BY row_data->>'Zona';

-- 3. Verificar especificamente as ZOTs esperadas
SELECT DISTINCT
    row_data->>'Zona' as zona,
    (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND row_data->>'Zona' IN ('ZOT 06', 'ZOT 07', 'ZOT 08', 'ZOT 08.1', 'ZOT 08.2', 'ZOT 08.3', 'ZOT 11', 'ZOT 12', 'ZOT 13')
ORDER BY row_data->>'Zona';