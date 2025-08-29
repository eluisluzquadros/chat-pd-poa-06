-- =====================================================
-- VERIFICAÇÃO SIMPLIFICADA - Estado do Banco
-- Execute este script para ver o que existe e o que falta
-- =====================================================

-- 1. Listar TODAS as tabelas existentes
SELECT 
    'TABELAS EXISTENTES:' as info;
    
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Verificar se tabelas essenciais existem
SELECT 
    '---' as separator,
    'VERIFICAÇÃO DE TABELAS ESSENCIAIS:' as info;

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'documents',
        'document_chunks',
        'document_embeddings',
        'document_rows',
        'sessions',
        'messages',
        'user_queries',
        'query_cache',
        'user_feedback',
        'regime_urbanistico',
        'secrets'
    ]) AS table_name
)
SELECT 
    rt.table_name,
    CASE 
        WHEN ist.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM required_tables rt
LEFT JOIN information_schema.tables ist 
    ON ist.table_name = rt.table_name 
    AND ist.table_schema = 'public'
ORDER BY 
    CASE WHEN ist.table_name IS NULL THEN 0 ELSE 1 END,
    rt.table_name;

-- 3. Para tabelas que existem, contar registros
SELECT 
    '---' as separator,
    'CONTAGEM DE REGISTROS:' as info;

DO $$
DECLARE
    tbl RECORD;
    cnt INTEGER;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('documents', 'document_chunks', 'regime_urbanistico', 'secrets')
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', tbl.table_name) INTO cnt;
        RAISE NOTICE '% : % registros', tbl.table_name, cnt;
    END LOOP;
END $$;