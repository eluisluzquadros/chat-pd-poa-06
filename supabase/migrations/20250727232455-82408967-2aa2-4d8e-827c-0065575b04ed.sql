-- Remove current irrelevant test cases
DELETE FROM qa_test_cases;

-- Insert relevant Urban Master Plan test cases
INSERT INTO qa_test_cases (question, expected_answer, category, difficulty, tags, is_active) VALUES 

-- Zoneamento
(
  'Quais são as zonas residenciais definidas no Plano Diretor de Porto Alegre?',
  'O Plano Diretor de Porto Alegre define várias zonas residenciais, incluindo Zonas Residenciais de baixa densidade (ZR1), média densidade (ZR2) e alta densidade (ZR3), cada uma com parâmetros específicos de ocupação e aproveitamento do solo.',
  'zoneamento',
  'medium',
  ARRAY['zonas', 'residencial', 'densidade'],
  true
),

-- Mobilidade
(
  'Como o Plano Diretor aborda a mobilidade urbana sustentável?',
  'O Plano Diretor prioriza o transporte coletivo, incentiva o uso de transportes não motorizados como bicicletas e caminhada, e estabelece diretrizes para integração entre diferentes modais de transporte, visando reduzir a dependência do transporte individual motorizado.',
  'mobilidade',
  'medium',
  ARRAY['transporte', 'sustentabilidade', 'coletivo'],
  true
),

-- Habitação
(
  'Quais são as diretrizes para habitação de interesse social no Plano Diretor?',
  'O Plano Diretor estabelece diretrizes para promoção de habitação de interesse social através de instrumentos como ZEIS (Zonas Especiais de Interesse Social), define percentuais mínimos para HIS em novos empreendimentos e promove a regularização fundiária de assentamentos precários.',
  'habitacao',
  'hard',
  ARRAY['his', 'zeis', 'social'],
  true
),

-- Meio Ambiente
(
  'Como o Plano Diretor protege as áreas verdes da cidade?',
  'O Plano Diretor estabelece um sistema de áreas verdes que inclui parques, praças, áreas de preservação permanente e corredores ecológicos. Define também instrumentos de proteção ambiental e incentivos para criação de novas áreas verdes.',
  'meio-ambiente',
  'medium',
  ARRAY['areas-verdes', 'preservacao', 'ambiente'],
  true
),

-- Uso do Solo
(
  'Quais são os coeficientes de aproveitamento básico e máximo no Plano Diretor?',
  'O Plano Diretor define coeficientes de aproveitamento básico que variam conforme a zona, geralmente entre 1,0 e 2,0, e coeficientes máximos que podem chegar a 4,0 em áreas de adensamento, mediante contrapartida através de outorga onerosa.',
  'uso-solo',
  'hard',
  ARRAY['coeficiente', 'aproveitamento', 'densidade'],
  true
);