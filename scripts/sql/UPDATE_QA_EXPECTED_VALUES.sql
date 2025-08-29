-- Atualizar valores esperados do QA baseado nos dados reais encontrados

-- 1. Cristal - índice médio real é 3.3125, não 2.375
UPDATE qa_test_cases
SET expected_answer = '3.3125'
WHERE question LIKE '%índice de aproveitamento médio%Cristal%';

-- 2. ZOTs com coeficiente > 4 - são 17, não apenas 9
UPDATE qa_test_cases
SET expected_answer = 'As ZOTs com coeficiente de aproveitamento máximo maior que 4 são: ZOT 06 (5.0), ZOT 07 (6.5), ZOT 08 (7.5), ZOT 08.1-A (6.5), ZOT 08.1-B (7.0), ZOT 08.1-C (7.5), ZOT 08.1-D (11.5), ZOT 08.1-E (11.5), ZOT 08.1-G (6.0), ZOT 08.2-A (7.5), ZOT 08.2-B (7.5), ZOT 08.3-A (7.5), ZOT 08.3-B (7.5), ZOT 08.3-C (7.5), ZOT 11 (5.0), ZOT 12 (6.5) e ZOT 13 (6.5)'
WHERE question LIKE '%ZOT%coeficiente%maior%4%';

-- Verificar os valores atuais
SELECT id, question, expected_answer 
FROM qa_test_cases 
WHERE question LIKE '%Cristal%' 
   OR question LIKE '%coeficiente%maior%4%';