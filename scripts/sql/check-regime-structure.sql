-- Verificar estrutura atual da tabela regime_urbanistico
SELECT 
    ordinal_position,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'regime_urbanistico'
AND table_schema = 'public'
ORDER BY ordinal_position;