-- ============================================================
-- CORRIGIR FUNÇÃO search_zots
-- ============================================================

-- Dropar função com erro
DROP FUNCTION IF EXISTS search_zots(TEXT, TEXT);

-- Recriar com colunas corretas baseado na estrutura real da tabela
-- A tabela usa "Zona" (com Z maiúsculo) e "Bairro" (com B maiúsculo)
CREATE OR REPLACE FUNCTION search_zots(
    zot_query TEXT DEFAULT NULL,
    bairro_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    zoneamento TEXT,
    bairro TEXT,
    altura_max BIGINT,
    ca_basico TEXT,
    ca_max TEXT,
    taxa_permeabilidade_ate BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."Zona"::TEXT as zoneamento,
        r."Bairro"::TEXT as bairro,
        r."Altura_Maxima___Edificacao_Isolada" as altura_max,
        r."Coeficiente_de_Aproveitamento___Basico" as ca_basico,
        r."Coeficiente_de_Aproveitamento___Maximo" as ca_max,
        r."Taxa_de_Permeabilidade_ate_1,500_m2" as taxa_permeabilidade_ate
    FROM regime_urbanistico_consolidado r
    WHERE (
        zot_query IS NULL 
        OR r."Zona" ILIKE '%' || zot_query || '%'
        OR r."Zona" ILIKE 'ZOT%' || zot_query
        OR r."Zona" ILIKE 'ZOT-' || zot_query
        OR r."Zona" ILIKE 'ZOT %' || zot_query
    )
    AND (
        bairro_query IS NULL 
        OR r."Bairro" ILIKE '%' || bairro_query || '%'
    )
    ORDER BY r."Zona", r."Bairro"
    LIMIT 20;
END;
$$;

-- Testar a função corrigida
SELECT 'Teste search_zots para ZOT 13:' as test;
SELECT * FROM search_zots('13', NULL) LIMIT 3;

SELECT 'Teste search_zots para JARDIM SÃO PEDRO:' as test;
SELECT * FROM search_zots(NULL, 'JARDIM SÃO PEDRO') LIMIT 3;

SELECT 'Teste search_zots para RESTINGA:' as test;
SELECT * FROM search_zots(NULL, 'RESTINGA') LIMIT 3;

-- Verificar colunas disponíveis
SELECT 
    'Colunas em regime_urbanistico_consolidado:' as info,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico_consolidado';

-- Verificar dados disponíveis
SELECT 
    'Dados disponíveis:' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT "Bairro") as bairros_unicos,
    COUNT(DISTINCT "Zona") as zonas_unicas
FROM regime_urbanistico_consolidado;

-- Mensagem de sucesso
SELECT '✅ Função search_zots corrigida com colunas corretas!' as status;