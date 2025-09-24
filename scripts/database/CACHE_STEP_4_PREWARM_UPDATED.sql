-- ============================================================
-- PASSO 4: PRE-AQUECER CACHE COM QUERIES COMUNS (ATUALIZADO)
-- Execute após criar funções simplificadas
-- ============================================================

-- 1. PRE-AQUECER QUERIES DE REGIME MAIS COMUNS
-- ============================================================

-- Centro Histórico
SELECT cache_regime_query('CENTRO HISTÓRICO', NULL);
SELECT cache_regime_query('CENTRO', NULL);

-- Moinhos de Vento
SELECT cache_regime_query('MOINHOS DE VENTO', NULL);

-- Cidade Baixa
SELECT cache_regime_query('CIDADE BAIXA', NULL);

-- Menino Deus
SELECT cache_regime_query('MENINO DEUS', NULL);

-- Restinga
SELECT cache_regime_query('RESTINGA', NULL);

-- Bela Vista
SELECT cache_regime_query('BELA VISTA', NULL);

-- Petrópolis
SELECT cache_regime_query('PETRÓPOLIS', NULL);

-- Zonas específicas
SELECT cache_regime_query(NULL, 'ZOT 13');
SELECT cache_regime_query(NULL, 'ZOT 01');
SELECT cache_regime_query(NULL, 'ZOT 08');
SELECT cache_regime_query(NULL, 'ZOT 06');
SELECT cache_regime_query(NULL, 'ZOT 11');

-- 2. INSERIR RESPOSTAS Q&A COMUNS DIRETAMENTE
-- ============================================================

-- Limpar duplicatas primeiro
DELETE FROM query_cache 
WHERE query_hash IN (
  MD5('o que sao zeis'),
  MD5('o que e coeficiente de aproveitamento'),
  MD5('como funciona outorga onerosa'),
  MD5('qual altura maxima permitida'),
  MD5('o que e taxa de ocupacao'),
  MD5('o que e zot'),
  MD5('regime urbanistico'),
  MD5('pode construir quantos andares'),
  MD5('afastamento lateral'),
  MD5('recuo jardim')
);

-- Inserir queries Q&A
INSERT INTO query_cache (query_hash, query_text, query_type, result, expires_at, created_at)
VALUES
  -- O que são ZEIS?
  (
    MD5('o que sao zeis'),
    'O que são ZEIS?',
    'qa',
    '{"resposta": "ZEIS (Zonas Especiais de Interesse Social) são áreas urbanas destinadas prioritariamente à produção e regularização de Habitação de Interesse Social (HIS). Elas visam garantir moradia digna para a população de baixa renda, promovendo a inclusão socioespacial e o cumprimento da função social da propriedade urbana. Em Porto Alegre, as ZEIS estão previstas no Plano Diretor e são fundamentais para a política habitacional da cidade."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Coeficiente de aproveitamento
  (
    MD5('o que e coeficiente de aproveitamento'),
    'O que é coeficiente de aproveitamento?',
    'qa',
    '{"resposta": "O coeficiente de aproveitamento é um índice urbanístico que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente. Existem dois tipos: BÁSICO (gratuito) e MÁXIMO (mediante outorga onerosa). Exemplo: terreno de 500m² com coeficiente básico 2.0 permite construir gratuitamente até 1.000m² de área total. Para construir além disso, até o coeficiente máximo, é necessário pagar outorga onerosa."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Outorga onerosa
  (
    MD5('como funciona outorga onerosa'),
    'Como funciona a outorga onerosa?',
    'qa',
    '{"resposta": "A outorga onerosa do direito de construir é um instrumento que permite construir acima do coeficiente básico até o máximo, mediante pagamento ao município. O valor é calculado com base na valorização imobiliária gerada pelo potencial construtivo adicional. Os recursos arrecadados devem ser aplicados em: regularização fundiária, programas habitacionais de interesse social, implantação de equipamentos comunitários, criação de espaços públicos e melhorias de infraestrutura urbana."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Altura máxima
  (
    MD5('qual altura maxima permitida'),
    'Qual a altura máxima permitida?',
    'qa',
    '{"resposta": "A altura máxima varia conforme a zona (ZOT) e o bairro específico. Exemplos em Porto Alegre: Centro Histórico (ZOT 08.1-B) permite até 75m; Jardim São Pedro (ZOT 13) permite até 60m; áreas residenciais de baixa densidade (ZOT 01) limitam a 9m; zonas mistas (ZOT 04) permitem até 18m. Sempre consulte o regime urbanístico específico do seu terreno para saber a altura exata permitida."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Taxa de ocupação
  (
    MD5('o que e taxa de ocupacao'),
    'O que é taxa de ocupação?',
    'qa',
    '{"resposta": "Taxa de ocupação é o percentual máximo do terreno que pode ser ocupado pela projeção horizontal da edificação. Por exemplo, uma taxa de 75% em um terreno de 400m² permite construir até 300m² de área no pavimento térreo. A taxa de ocupação trabalha em conjunto com o coeficiente de aproveitamento para definir a volumetria possível da edificação."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- O que é ZOT
  (
    MD5('o que e zot'),
    'O que é ZOT?',
    'qa',
    '{"resposta": "ZOT significa Zona de Ocupação e Transformação, uma classificação do zoneamento urbano de Porto Alegre que define os parâmetros construtivos e usos permitidos em cada área da cidade. Existem diferentes ZOTs (01 a 15), cada uma com características específicas de altura máxima, coeficientes de aproveitamento, usos permitidos e restrições. A ZOT determina o que e como se pode construir em cada terreno."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Regime urbanístico
  (
    MD5('regime urbanistico'),
    'O que é regime urbanístico?',
    'qa',
    '{"resposta": "Regime urbanístico é o conjunto de normas e parâmetros que regulam o uso e ocupação do solo urbano. Inclui: altura máxima das edificações, coeficientes de aproveitamento (básico e máximo), taxa de ocupação, recuos e afastamentos, área e testada mínima de lote, usos permitidos e proibidos, taxa de permeabilidade. Cada bairro e zona tem seu regime específico definido no Plano Diretor."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Quantos andares
  (
    MD5('pode construir quantos andares'),
    'Posso construir quantos andares?',
    'qa',
    '{"resposta": "O número de andares depende da altura máxima permitida na zona e do pé-direito de cada pavimento. Por exemplo: altura máxima de 42m com pé-direito de 3m permite aproximadamente 14 pavimentos; altura de 18m permite cerca de 6 pavimentos; altura de 9m limita a 3 pavimentos. Consulte o regime urbanístico do seu bairro para saber a altura máxima específica."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Afastamento lateral
  (
    MD5('afastamento lateral'),
    'Qual o afastamento lateral obrigatório?',
    'qa',
    '{"resposta": "O afastamento lateral em Porto Alegre geralmente é de 18% da altura total da edificação, aplicável para construções acima de 12,5m de altura. Para edificações até 12,5m, pode ser isento dependendo da zona. Exemplo: prédio de 30m de altura precisa de afastamento lateral de 5,4m (18% de 30m). Sempre verifique o regime específico da sua zona."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  
  -- Recuo jardim
  (
    MD5('recuo jardim'),
    'O que é recuo de jardim?',
    'qa',
    '{"resposta": "Recuo de jardim é o afastamento obrigatório entre a edificação e o alinhamento frontal do terreno (divisa com a rua). Em Porto Alegre, o recuo padrão é de 4 metros na maioria das zonas urbanas. Este espaço deve permanecer livre de construções e geralmente é ajardinado, contribuindo para a permeabilidade do solo e qualidade urbana."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  );

-- 3. ADICIONAR QUERIES DE COMPARAÇÃO
-- ============================================================

SELECT add_to_cache(
  'comparar centro com moinhos',
  'comparison',
  '[{"centro": {"altura": "75m", "coef_basico": "variado"}, "moinhos": {"altura": "60m", "coef_basico": "3.6"}}]'::JSONB
);

SELECT add_to_cache(
  'bairros maior potencial construtivo',
  'analysis',
  '[{"bairros": ["Centro Histórico", "Moinhos de Vento", "Bela Vista", "Petrópolis"], "caracteristica": "ZOT 13 com coeficiente máximo 6.5"}]'::JSONB
);

-- 4. VERIFICAR CACHE PRE-AQUECIDO
-- ============================================================

SELECT 
  query_type,
  COUNT(*) as queries_cached,
  AVG(hit_count) as avg_hits,
  MAX(LENGTH(result::text)) as max_result_size
FROM query_cache
GROUP BY query_type
ORDER BY queries_cached DESC;

-- 5. ESTATÍSTICAS FINAIS
-- ============================================================

SELECT * FROM cache_statistics;

-- 6. MOSTRAR TOP QUERIES EM CACHE
-- ============================================================

SELECT 
  SUBSTRING(query_text, 1, 50) as query,
  query_type,
  hit_count,
  CASE 
    WHEN LENGTH(result::text) > 100 
    THEN SUBSTRING(result::text, 1, 100) || '...'
    ELSE result::text
  END as result_preview,
  created_at
FROM query_cache
ORDER BY created_at DESC
LIMIT 15;

-- 7. TESTE DE PERFORMANCE
-- ============================================================

-- Testar busca sem cache (primeira vez)
EXPLAIN ANALYZE
SELECT * FROM fast_regime_lookup_simple('FLORESTA', NULL);

-- Testar busca com cache (já aquecido)
EXPLAIN ANALYZE
SELECT cache_regime_query('CENTRO HISTÓRICO', NULL);

-- 8. RESUMO DO PRE-AQUECIMENTO
-- ============================================================

WITH cache_summary AS (
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE query_type = 'regime') as regime_queries,
    COUNT(*) FILTER (WHERE query_type = 'qa') as qa_queries,
    COUNT(*) FILTER (WHERE query_type IN ('comparison', 'analysis')) as analysis_queries
  FROM query_cache
)
SELECT 
  '🚀 CACHE PRE-AQUECIDO' as status,
  total || ' queries totais (' ||
  regime_queries || ' regime, ' ||
  qa_queries || ' Q&A, ' ||
  analysis_queries || ' análises)' as details
FROM cache_summary;

-- ============================================================
-- CACHE ESTÁ PRONTO PARA USO!
-- Taxa de hit esperada: 75%+ após 24h de uso
-- Tempo de resposta esperado: <2 segundos
-- ============================================================