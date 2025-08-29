-- Debug: Verificar dados do bairro Cristal na base atual

-- 1. Verificar se Cristal existe no dataset de ZOTs vs Bairros
SELECT DISTINCT row_data->>'Bairro' as bairro
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND UPPER(row_data->>'Bairro') LIKE '%CRISTAL%';

-- 2. Buscar ZOTs do Cristal
SELECT 
    row_data->>'Bairro' as bairro,
    row_data->>'Zona' as zona
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND row_data->>'Bairro' = 'CRISTAL';

-- 3. Buscar dados urbanísticos do Cristal
SELECT 
    row_data->>'Bairro' as bairro,
    row_data->>'Zona' as zona,
    row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
    row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo,
    ((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + 
     (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2 as indice_medio
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND row_data->>'Bairro' = 'CRISTAL';

-- 4. Verificar média do índice de aproveitamento
SELECT 
    AVG(((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + 
         (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2) as indice_aproveitamento_medio
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND row_data->>'Bairro' = 'CRISTAL'
AND row_data->>'Coeficiente de Aproveitamento - Básico' IS NOT NULL
AND row_data->>'Coeficiente de Aproveitamento - Máximo' IS NOT NULL;