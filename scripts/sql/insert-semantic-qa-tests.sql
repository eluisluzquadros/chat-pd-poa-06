-- Script para inserir casos de teste QA para variações semânticas

-- 1. Testes de variações de nomes de zonas
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length, expected_response) VALUES
-- Variações de ZOT 07
('semantic_zone_zot07_v1', 'Qual a altura máxima na ZOT 07?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),
('semantic_zone_zot07_v2', 'Qual a altura máxima na ZOT7?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),
('semantic_zone_zot07_v3', 'Qual a altura máxima na ZOT 7?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),
('semantic_zone_zot07_v4', 'Qual a altura máxima na zona 07?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),
('semantic_zone_zot07_v5', 'Qual a altura máxima na zona 7?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),
('semantic_zone_zot07_v6', 'Qual a altura máxima na ZONA07?', ARRAY['altura', 'máxima', 'ZOT 07', 'metros'], 'semantic_variation', 'medium', 100, 'A altura máxima na ZOT 07 varia dependendo da subdivisão'),

-- Variações de ZOT 15
('semantic_zone_zot15_v1', 'Quais são os parâmetros da ZOT 15?', ARRAY['parâmetros', 'ZOT 15', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 150, 'Os parâmetros da ZOT 15 incluem altura máxima, coeficiente de aproveitamento'),
('semantic_zone_zot15_v2', 'Quais são os parâmetros da ZOT15?', ARRAY['parâmetros', 'ZOT 15', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 150, 'Os parâmetros da ZOT 15 incluem altura máxima, coeficiente de aproveitamento'),
('semantic_zone_zot15_v3', 'Quais são os parâmetros da zona 15?', ARRAY['parâmetros', 'ZOT 15', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 150, 'Os parâmetros da ZOT 15 incluem altura máxima, coeficiente de aproveitamento');

-- 2. Testes de variações de nomes de bairros
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length, expected_response) VALUES
-- Variações de Petrópolis
('semantic_bairro_petropolis_v1', 'Qual a altura máxima no bairro Petrópolis?', ARRAY['altura', 'máxima', 'Petrópolis', 'metros'], 'semantic_variation', 'medium', 150, 'No bairro Petrópolis, a altura máxima varia conforme a zona'),
('semantic_bairro_petropolis_v2', 'Qual a altura máxima no bairro PETRÓPOLIS?', ARRAY['altura', 'máxima', 'Petrópolis', 'metros'], 'semantic_variation', 'medium', 150, 'No bairro Petrópolis, a altura máxima varia conforme a zona'),
('semantic_bairro_petropolis_v3', 'Qual a altura máxima no bairro Petropolis?', ARRAY['altura', 'máxima', 'Petrópolis', 'metros'], 'semantic_variation', 'medium', 150, 'No bairro Petrópolis, a altura máxima varia conforme a zona'),
('semantic_bairro_petropolis_v4', 'Qual a altura máxima no bairro PETROPOLIS?', ARRAY['altura', 'máxima', 'Petrópolis', 'metros'], 'semantic_variation', 'medium', 150, 'No bairro Petrópolis, a altura máxima varia conforme a zona'),
('semantic_bairro_petropolis_v5', 'Qual a altura máxima em petropolis?', ARRAY['altura', 'máxima', 'Petrópolis', 'metros'], 'semantic_variation', 'medium', 150, 'No bairro Petrópolis, a altura máxima varia conforme a zona'),
('semantic_bairro_petropolis_v6', 'Petrópolis', ARRAY['Petrópolis', 'zona', 'altura'], 'semantic_variation', 'simple', 150, 'Petrópolis é um bairro de Porto Alegre com as seguintes zonas e parâmetros'),

-- Variações de Centro Histórico
('semantic_bairro_centro_v1', 'O que posso construir no Centro Histórico?', ARRAY['construir', 'Centro Histórico', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 200, 'No Centro Histórico, os parâmetros construtivos variam por zona'),
('semantic_bairro_centro_v2', 'O que posso construir no CENTRO HISTÓRICO?', ARRAY['construir', 'Centro Histórico', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 200, 'No Centro Histórico, os parâmetros construtivos variam por zona'),
('semantic_bairro_centro_v3', 'O que posso construir no Centro Historico?', ARRAY['construir', 'Centro Histórico', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 200, 'No Centro Histórico, os parâmetros construtivos variam por zona'),
('semantic_bairro_centro_v4', 'O que posso construir no centro histórico?', ARRAY['construir', 'Centro Histórico', 'altura', 'coeficiente'], 'semantic_variation', 'medium', 200, 'No Centro Histórico, os parâmetros construtivos variam por zona'),

-- Variações com contexto
('semantic_context_v1', 'Quais as regras de construção no bairro Cristal?', ARRAY['regras', 'construção', 'Cristal', 'altura'], 'semantic_variation', 'medium', 200, 'No bairro Cristal, as regras de construção incluem'),
('semantic_context_v2', 'Quais as regras de construção do bairro Cristal?', ARRAY['regras', 'construção', 'Cristal', 'altura'], 'semantic_variation', 'medium', 200, 'No bairro Cristal, as regras de construção incluem'),
('semantic_context_v3', 'Quais as regras de construção em Cristal?', ARRAY['regras', 'construção', 'Cristal', 'altura'], 'semantic_variation', 'medium', 200, 'No bairro Cristal, as regras de construção incluem');

-- 3. Testes de perguntas sobre riscos de desastre
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length, expected_response) VALUES
('risk_inundation_v1', 'Quais bairros têm risco de inundação?', ARRAY['risco', 'inundação', 'bairros'], 'risk_assessment', 'medium', 200, 'Os bairros com risco de inundação em Porto Alegre incluem'),
('risk_specific_bairro_v1', 'Quais os riscos do bairro Centro Histórico?', ARRAY['risco', 'Centro Histórico', 'inundação', 'alagamento'], 'risk_assessment', 'medium', 150, 'O bairro Centro Histórico apresenta os seguintes riscos'),
('risk_high_level_v1', 'Liste os bairros com alto risco de desastre', ARRAY['alto', 'risco', 'desastre', 'bairros'], 'risk_assessment', 'high', 250, 'Os bairros com alto risco de desastre em Porto Alegre são'),
('risk_deslizamento_v1', 'Quais áreas de Porto Alegre têm risco de deslizamento?', ARRAY['risco', 'deslizamento', 'áreas', 'Porto Alegre'], 'risk_assessment', 'medium', 200, 'As áreas com risco de deslizamento em Porto Alegre incluem'),
('risk_specific_check_v1', 'O bairro Petrópolis tem risco de alagamento?', ARRAY['Petrópolis', 'risco', 'alagamento'], 'risk_assessment', 'simple', 100, 'O bairro Petrópolis'),
('risk_critical_v1', 'Mostre os bairros com risco crítico', ARRAY['bairros', 'risco', 'crítico', 'alto'], 'risk_assessment', 'medium', 200, 'Os bairros com risco crítico em Porto Alegre'),
('risk_granizo_v1', 'Quais zonas têm risco de granizo?', ARRAY['zonas', 'risco', 'granizo'], 'risk_assessment', 'medium', 150, 'As zonas com risco de granizo incluem'),
('risk_areas_criticas_v1', 'Liste as áreas críticas do bairro Cristal', ARRAY['áreas críticas', 'Cristal', 'risco'], 'risk_assessment', 'medium', 150, 'As áreas críticas do bairro Cristal são')
ON CONFLICT (test_id) DO UPDATE SET
  query = EXCLUDED.query,
  expected_keywords = EXCLUDED.expected_keywords,
  category = EXCLUDED.category,
  complexity = EXCLUDED.complexity,
  min_response_length = EXCLUDED.min_response_length,
  expected_response = EXCLUDED.expected_response,
  updated_at = NOW();

-- Marcar todos os novos casos como ativos
UPDATE qa_test_cases 
SET is_active = true 
WHERE test_id LIKE 'semantic_%' OR test_id LIKE 'risk_%';