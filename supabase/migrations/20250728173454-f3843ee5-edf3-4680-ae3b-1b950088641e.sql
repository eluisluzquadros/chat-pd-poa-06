-- Add specific test cases for Petrópolis neighborhood to validate precision
INSERT INTO qa_test_cases (
  question,
  expected_answer,
  category,
  difficulty,
  tags,
  is_sql_related,
  is_active
) VALUES 
(
  'Liste todas as ZOTs do bairro Petrópolis',
  'As ZOTs presentes no bairro Petrópolis são: ZOT 07, ZOT 08.3-B e ZOT 08.3-C. Estas são as únicas zonas de ordenamento territorial existentes neste bairro.',
  'zoning',
  'easy',
  ARRAY['petrolopolis', 'zot', 'bairro', 'validation'],
  false,
  true
),
(
  'Quais são os parâmetros construtivos para o bairro Petrópolis?',
  'Os parâmetros construtivos para o bairro Petrópolis variam por ZOT: ZOT 07 (altura máxima 60m), ZOT 08.3-B (altura máxima 90m), ZOT 08.3-C (altura máxima 90m). Cada ZOT possui coeficientes de aproveitamento específicos.',
  'construction',
  'medium', 
  ARRAY['petrolopolis', 'parametros', 'construcao', 'validation'],
  true,
  true
),
(
  'O bairro Petrópolis possui ZOT 08.1?',
  'Não, o bairro Petrópolis não possui ZOT 08.1. As ZOTs existentes em Petrópolis são apenas: ZOT 07, ZOT 08.3-B e ZOT 08.3-C.',
  'zoning',
  'easy',
  ARRAY['petrolopolis', 'zot', 'validacao', 'negativo'],
  false,
  true
);