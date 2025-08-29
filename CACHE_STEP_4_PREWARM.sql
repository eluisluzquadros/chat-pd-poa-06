-- ============================================================
-- PASSO 4: PRE-AQUECER CACHE COM QUERIES COMUNS
-- Execute após criar funções
-- ============================================================

-- 1. PRE-AQUECER QUERIES DE REGIME MAIS COMUNS
-- ============================================================

-- Centro Histórico
SELECT * FROM fast_regime_lookup('CENTRO HISTÓRICO', NULL, TRUE);
SELECT * FROM fast_regime_lookup('CENTRO', NULL, TRUE);

-- Moinhos de Vento
SELECT * FROM fast_regime_lookup('MOINHOS DE VENTO', NULL, TRUE);

-- Cidade Baixa
SELECT * FROM fast_regime_lookup('CIDADE BAIXA', NULL, TRUE);

-- Menino Deus
SELECT * FROM fast_regime_lookup('MENINO DEUS', NULL, TRUE);

-- Restinga
SELECT * FROM fast_regime_lookup('RESTINGA', NULL, TRUE);

-- Zonas específicas
SELECT * FROM fast_regime_lookup(NULL, 'ZOT 13', TRUE);
SELECT * FROM fast_regime_lookup(NULL, 'ZOT 01', TRUE);
SELECT * FROM fast_regime_lookup(NULL, 'ZOT 08', TRUE);

-- 2. INSERIR RESPOSTAS COMUNS DIRETAMENTE
-- ============================================================

INSERT INTO query_cache (query_hash, query_text, query_type, result, expires_at)
VALUES
  -- O que são ZEIS?
  (
    MD5('o que sao zeis'),
    'O que são ZEIS?',
    'qa',
    '{"resposta": "ZEIS (Zonas Especiais de Interesse Social) são áreas urbanas destinadas prioritariamente à produção e regularização de Habitação de Interesse Social (HIS). Elas visam garantir moradia digna para a população de baixa renda, promovendo a inclusão socioespacial e o cumprimento da função social da propriedade urbana."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  ),
  
  -- Coeficiente de aproveitamento
  (
    MD5('o que e coeficiente de aproveitamento'),
    'O que é coeficiente de aproveitamento?',
    'qa',
    '{"resposta": "O coeficiente de aproveitamento é um índice urbanístico que determina quanto se pode construir em um terreno. É calculado multiplicando a área do terreno pelo coeficiente. Exemplo: terreno de 500m² com coeficiente 2.0 permite construir até 1.000m² de área total."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  ),
  
  -- Outorga onerosa
  (
    MD5('como funciona outorga onerosa'),
    'Como funciona a outorga onerosa?',
    'qa',
    '{"resposta": "A outorga onerosa do direito de construir é um instrumento que permite construir acima do coeficiente básico mediante pagamento ao município. O valor arrecadado deve ser aplicado em regularização fundiária, programas habitacionais, implantação de equipamentos comunitários e criação de espaços públicos."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  ),
  
  -- Altura máxima
  (
    MD5('qual altura maxima permitida'),
    'Qual a altura máxima permitida?',
    'qa',
    '{"resposta": "A altura máxima varia conforme a zona e o bairro. Por exemplo: Centro Histórico permite até 75m em algumas zonas, enquanto áreas residenciais podem ter limites de 9m a 42m. Consulte o regime urbanístico específico do seu bairro para saber a altura permitida."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  ),
  
  -- Taxa de ocupação
  (
    MD5('o que e taxa de ocupacao'),
    'O que é taxa de ocupação?',
    'qa',
    '{"resposta": "Taxa de ocupação é o percentual máximo do terreno que pode ser ocupado pela projeção da edificação. Por exemplo, uma taxa de 75% em um terreno de 400m² permite construir até 300m² de área no térreo."}'::JSONB,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  )
ON CONFLICT (query_hash) DO NOTHING;

-- 3. VERIFICAR CACHE PRE-AQUECIDO
-- ============================================================

SELECT 
  query_type,
  COUNT(*) as queries_cached,
  AVG(hit_count) as avg_hits,
  MAX(LENGTH(result::text)) as max_result_size
FROM query_cache
GROUP BY query_type;

-- 4. ESTATÍSTICAS FINAIS
-- ============================================================

SELECT * FROM cache_statistics;

-- Mostrar queries em cache
SELECT 
  query_text,
  query_type,
  hit_count,
  created_at,
  expires_at
FROM query_cache
ORDER BY hit_count DESC, created_at DESC
LIMIT 20;