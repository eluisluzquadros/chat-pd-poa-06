-- TESTE 1: Verificar se a tabela document_rows existe e tem dados
SELECT COUNT(*) as total_rows FROM document_rows;

-- TESTE 2: Verificar datasets disponíveis
SELECT DISTINCT dataset_id, COUNT(*) as row_count 
FROM document_rows 
GROUP BY dataset_id;

-- TESTE 3: Verificar estrutura do JSONB row_data
SELECT 
    dataset_id,
    row_data,
    jsonb_typeof(row_data) as data_type
FROM document_rows 
LIMIT 5;

-- TESTE 4: Buscar bairro Cristal especificamente
SELECT 
    dataset_id,
    row_data->>'Bairro' as bairro,
    row_data
FROM document_rows 
WHERE row_data->>'Bairro' ILIKE '%cristal%'
LIMIT 10;

-- TESTE 5: Verificar campos de coeficiente
SELECT 
    dataset_id,
    row_data->>'Zona' as zona,
    row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
    row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND row_data->>'Coeficiente de Aproveitamento - Máximo' IS NOT NULL
LIMIT 10;

-- TESTE 6: Listar todos os campos disponíveis no dataset de regime urbanístico
SELECT DISTINCT jsonb_object_keys(row_data) as campo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
LIMIT 50;

-- TESTE 7: Verificar se existe a função execute_sql_query
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'execute_sql_query';

-- TESTE 8: Testar a função execute_sql_query diretamente
SELECT execute_sql_query('SELECT 1 as test');

-- TESTE 9: Buscar dados do Três Figueiras
SELECT 
    row_data->>'Bairro' as bairro,
    row_data->>'Zona' as zona
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND (row_data->>'Bairro' ILIKE '%figueira%' OR row_data->>'Bairro' ILIKE '%tres%')
LIMIT 20;

-- TESTE 10: Verificar ZOT 08 e seus bairros
SELECT 
    row_data->>'Bairro' as bairro,
    row_data->>'Zona' as zona
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND row_data->>'Zona' LIKE 'ZOT 08%'
ORDER BY row_data->>'Zona', row_data->>'Bairro';