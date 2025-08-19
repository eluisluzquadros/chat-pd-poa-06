-- ============================================================
-- CORRIGIR FUNÇÃO search_zots
-- ============================================================

-- Primeiro, vamos verificar a estrutura da tabela regime_urbanistico_consolidado
-- A tabela pode ter a coluna 'zot' ao invés de 'zoneamento'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico_consolidado'
LIMIT 10;

-- Dropar função com erro
DROP FUNCTION IF EXISTS search_zots(TEXT, TEXT);

-- Recriar com colunas corretas
-- Usando 'zot' ao invés de 'zoneamento' baseado na estrutura da tabela
CREATE OR REPLACE FUNCTION search_zots(
    zot_query TEXT DEFAULT NULL,
    bairro_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    zoneamento TEXT,
    bairro TEXT,
    altura_max NUMERIC,
    ca_max NUMERIC,
    to_max NUMERIC,
    taxa_permeabilidade NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.zot::TEXT as zoneamento,
        r.bairro::TEXT,
        r.altura_max,
        r.ca_max,
        r.to_max,
        r.taxa_permeabilidade
    FROM regime_urbanistico_consolidado r
    WHERE (
        zot_query IS NULL 
        OR r.zot ILIKE '%' || zot_query || '%'
        OR r.zot ILIKE 'ZOT%' || zot_query
        OR r.zot ILIKE 'ZOT-' || zot_query
    )
    AND (
        bairro_query IS NULL 
        OR r.bairro ILIKE '%' || bairro_query || '%'
    )
    ORDER BY r.zot, r.bairro
    LIMIT 20;
END;
$$;

-- Testar a função corrigida
SELECT 'Teste search_zots para ZOT 8:' as test;
SELECT * FROM search_zots('8', NULL) LIMIT 3;

SELECT 'Teste search_zots para Centro:' as test;
SELECT * FROM search_zots(NULL, 'Centro') LIMIT 3;

-- Verificar colunas disponíveis
SELECT 
    'Colunas em regime_urbanistico_consolidado:' as info,
    array_agg(column_name) as columns
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico_consolidado';

-- Mensagem de sucesso
SELECT '✅ Função search_zots corrigida!' as status;