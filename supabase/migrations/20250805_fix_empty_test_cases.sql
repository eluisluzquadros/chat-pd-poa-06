-- Clean up empty test cases
DELETE FROM qa_test_cases 
WHERE (question IS NULL OR question = '') 
   AND (expected_answer IS NULL OR expected_answer = '');

-- Insert sample test cases if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM qa_test_cases WHERE question IS NOT NULL AND question != '') THEN
    INSERT INTO qa_test_cases (
      question, 
      expected_answer, 
      category, 
      difficulty, 
      is_active, 
      is_sql_related, 
      tags
    ) VALUES
    -- Greeting tests
    ('Olá', 'Olá! Como posso ajudá-lo com informações sobre o Plano Diretor de Porto Alegre?', 'geral', 'simple', true, false, ARRAY['saudacao', 'basico']),
    
    -- Zone queries
    ('Quais são as zonas da cidade?', 'Porto Alegre possui diversas zonas urbanas definidas no Plano Diretor, incluindo zonas residenciais, comerciais, industriais e mistas. As principais categorias são: Zona Residencial (ZR), Zona Comercial (ZC), Zona Industrial (ZI), Zona Mista (ZM) e Zona de Proteção Ambiental (ZPA).', 'zonas', 'simple', true, false, ARRAY['zonas', 'classificacao']),
    
    ('Qual a altura máxima permitida na Zona Central?', 'Na Zona Central de Porto Alegre, a altura máxima permitida varia conforme o quarteirão específico e pode chegar até 52 metros em algumas áreas, respeitando os índices construtivos e recuos estabelecidos pelo Plano Diretor.', 'altura_maxima', 'medium', true, false, ARRAY['altura', 'zona_central', 'indices']),
    
    -- Construction coefficient
    ('O que é coeficiente de aproveitamento?', 'O coeficiente de aproveitamento é um índice que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente estabelecido para a zona. Por exemplo, um terreno de 500m² com coeficiente 2,0 permite construir até 1.000m² de área computável.', 'coeficiente_aproveitamento', 'medium', true, false, ARRAY['indices', 'construcao', 'conceitual']),
    
    -- Neighborhood queries
    ('Quais são os bairros da zona sul?', 'Os principais bairros da zona sul de Porto Alegre incluem: Cristal, Camaquã, Cavalhada, Nonoai, Teresópolis, Vila Nova, Espírito Santo, Guarujá, Ipanema, Pedra Redonda, Serraria, Ponta Grossa, Belém Velho, Chapéu do Sol, Belém Novo, Lami e Lageado.', 'bairros', 'simple', true, false, ARRAY['bairros', 'zona_sul', 'localizacao']),
    
    -- Permeability rate
    ('Qual a taxa de permeabilidade mínima?', 'A taxa de permeabilidade mínima varia conforme a zona. Em zonas residenciais geralmente é de 20% da área do terreno, enquanto em zonas de proteção ambiental pode chegar a 40% ou mais. Esta área deve permanecer permeável para absorção de água da chuva.', 'taxa_permeabilidade', 'medium', true, false, ARRAY['permeabilidade', 'meio_ambiente', 'indices']),
    
    -- Setbacks
    ('Quais são os recuos obrigatórios?', 'Os recuos obrigatórios variam por zona e altura da edificação. Geralmente: recuo frontal mínimo de 4 metros, recuos laterais de 1,50m (ou H/10 para edificações acima de 12m), e recuo de fundos seguindo as mesmas regras dos laterais. Consulte o anexo específico da zona para valores exatos.', 'recuos', 'complex', true, false, ARRAY['recuos', 'afastamentos', 'normas']),
    
    -- SQL related query
    ('Liste todas as zonas com coeficiente maior que 2', 'SELECT nome_zona, coeficiente_aproveitamento FROM zonas WHERE coeficiente_aproveitamento > 2 ORDER BY coeficiente_aproveitamento DESC', 'zonas', 'complex', true, true, ARRAY['sql', 'consulta', 'coeficiente']),
    
    -- General conceptual
    ('O que é o Plano Diretor?', 'O Plano Diretor de Desenvolvimento Urbano Ambiental (PDDUA) é o instrumento básico da política de desenvolvimento do Município de Porto Alegre. Ele estabelece as normas de ordenamento territorial, uso e ocupação do solo, sistema viário, desenvolvimento econômico e social, visando o pleno desenvolvimento das funções sociais da cidade.', 'conceitual', 'simple', true, false, ARRAY['conceitual', 'definicao', 'basico']);
  END IF;
END $$;