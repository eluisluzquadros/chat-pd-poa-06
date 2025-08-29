-- ============================================================
-- SCRIPT PARA ADICIONAR COLUNA KEYWORDS NA TABELA QA_TEST_CASES
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna keywords
ALTER TABLE qa_test_cases 
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

-- 2. Adicionar comentário descritivo
COMMENT ON COLUMN qa_test_cases.keywords IS 'Palavras-chave esperadas na resposta para validação de precisão';

-- 3. Popular keywords para casos críticos de artigos legais
UPDATE qa_test_cases 
SET keywords = ARRAY['LUOS', 'Art. 89', 'EIV', 'Estudo', 'Impacto', 'Vizinhança']
WHERE question ILIKE '%estudo de impacto de vizinhança%' 
   OR question ILIKE '%eiv%';

UPDATE qa_test_cases 
SET keywords = ARRAY['PDUS', 'Art. 92', 'ZEIS', 'Zonas', 'Interesse Social']
WHERE question ILIKE '%zeis%' 
   AND question ILIKE '%pdus%';

UPDATE qa_test_cases 
SET keywords = ARRAY['LUOS', 'Art. 81', 'certificação', 'sustentabilidade', 'ambiental']
WHERE question ILIKE '%certificação%sustentabilidade%';

UPDATE qa_test_cases 
SET keywords = ARRAY['LUOS', 'Art. 86', 'outorga', 'onerosa']
WHERE question ILIKE '%outorga onerosa%';

UPDATE qa_test_cases 
SET keywords = ARRAY['LUOS', 'Art. 82', 'coeficiente', 'aproveitamento']
WHERE question ILIKE '%coeficiente%aproveitamento%' 
   AND question ILIKE '%artigo%';

UPDATE qa_test_cases 
SET keywords = ARRAY['LUOS', 'Art. 83', 'recuos', 'obrigatórios']
WHERE question ILIKE '%recuos obrigatórios%' 
   AND question ILIKE '%artigo%';

UPDATE qa_test_cases 
SET keywords = ARRAY['PDUS', 'Art. 95', 'preservação', 'permanente', 'APP']
WHERE question ILIKE '%preservação permanente%' 
   OR question ILIKE '%APP%';

-- 4. Popular keywords para perguntas sobre altura máxima
UPDATE qa_test_cases 
SET keywords = ARRAY['metros', 'altura', 'máxima']
WHERE category = 'altura_maxima'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['130', 'metros', 'Centro Histórico']
WHERE question ILIKE '%altura máxima%mais alta%';

-- 5. Popular keywords para perguntas sobre bairros
UPDATE qa_test_cases 
SET keywords = ARRAY['Três Figueiras', 'ZOT', 'altura', 'coeficiente']
WHERE question ILIKE '%três figueiras%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['Boa Vista', 'ZOT', '90m', '60m', '18m']
WHERE question ILIKE '%boa vista%'
   AND NOT question ILIKE '%boa vista do sul%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['Centro Histórico', 'ZOT 08.1', '130m', '100m']
WHERE question ILIKE '%centro histórico%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['Mário Quintana', 'risco', 'inundação']
WHERE question ILIKE '%mário quintana%'
   AND keywords IS NULL;

-- 6. Popular keywords para perguntas sobre ZOTs e zoneamento
UPDATE qa_test_cases 
SET keywords = ARRAY['16', 'ZOTs', 'Zonas', 'Ordenamento', 'Territorial']
WHERE question ILIKE '%quantas%zot%'
   OR (question ILIKE '%zoneamento%' AND question ILIKE '%nova luos%');

UPDATE qa_test_cases 
SET keywords = ARRAY['ZOT', 'zona', 'bairro']
WHERE category IN ('zonas', 'zoneamento')
   AND keywords IS NULL;

-- 7. Popular keywords para conceitos gerais
UPDATE qa_test_cases 
SET keywords = ARRAY['gentrificação', 'valorização', 'imobiliária']
WHERE question ILIKE '%gentrificação%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['CMDUA', 'Conselho', 'Municipal', 'Desenvolvimento']
WHERE question ILIKE '%cmdua%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['4º Distrito', 'Art. 74', 'LUOS']
WHERE question ILIKE '%4º distrito%'
   OR question ILIKE '%quarto distrito%';

-- 8. Popular keywords para taxa de permeabilidade
UPDATE qa_test_cases 
SET keywords = ARRAY['permeabilidade', 'taxa', 'mínima', '%']
WHERE question ILIKE '%permeabilidade%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['ocupação', 'taxa', 'construída', '%']
WHERE question ILIKE '%taxa de ocupação%'
   AND keywords IS NULL;

-- 9. Popular keywords genéricas para categorias
UPDATE qa_test_cases 
SET keywords = ARRAY['regime', 'urbanístico', 'índices', 'altura', 'coeficiente']
WHERE category = 'bairros'
   AND question ILIKE '%regime urbanístico%'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['HIS', 'habitação', 'interesse social', 'déficit']
WHERE category = 'habitacao'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['mobilidade', 'transporte', 'deslocamento']
WHERE category = 'mobilidade'
   AND keywords IS NULL;

UPDATE qa_test_cases 
SET keywords = ARRAY['enchentes', '2024', 'inundação', 'resposta']
WHERE question ILIKE '%enchentes%2024%'
   AND keywords IS NULL;

-- 10. Popular keywords para casos sem categoria específica
UPDATE qa_test_cases 
SET keywords = ARRAY['plano diretor', 'porto alegre', 'pdus']
WHERE keywords IS NULL
   AND category = 'conceitual';

UPDATE qa_test_cases 
SET keywords = ARRAY['luos', 'uso', 'solo']
WHERE keywords IS NULL
   AND category = 'uso-solo';

-- 11. Verificar quantos casos têm keywords
SELECT 
    category,
    COUNT(*) as total,
    COUNT(CASE WHEN keywords IS NOT NULL AND array_length(keywords, 1) > 0 THEN 1 END) as com_keywords,
    COUNT(CASE WHEN keywords IS NULL OR array_length(keywords, 1) = 0 THEN 1 END) as sem_keywords
FROM qa_test_cases
GROUP BY category
ORDER BY category;

-- 12. Mostrar amostra de casos com keywords
SELECT 
    id,
    category,
    LEFT(question, 80) as pergunta,
    keywords
FROM qa_test_cases
WHERE keywords IS NOT NULL 
   AND array_length(keywords, 1) > 0
LIMIT 10;

-- ============================================================
-- FIM DO SCRIPT
-- Total esperado: ~80-100 casos com keywords populadas
-- ============================================================