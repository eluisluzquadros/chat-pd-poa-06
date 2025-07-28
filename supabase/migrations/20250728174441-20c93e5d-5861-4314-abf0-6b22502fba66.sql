-- Fix spelling error in test case tags for Petrópolis neighborhood
UPDATE qa_test_cases 
SET tags = ARRAY['petropolis', 'zot', 'bairro', 'validation']
WHERE question = 'Liste todas as ZOTs do bairro Petrópolis';

UPDATE qa_test_cases 
SET tags = ARRAY['petropolis', 'parametros', 'construcao', 'validation']
WHERE question = 'Quais são os parâmetros construtivos para o bairro Petrópolis?';

UPDATE qa_test_cases 
SET tags = ARRAY['petropolis', 'zot', 'validacao', 'negativo']
WHERE question = 'O bairro Petrópolis possui ZOT 08.1?';