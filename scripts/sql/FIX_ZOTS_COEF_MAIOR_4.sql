-- URGENTE: Garantir que as ZOTs com coeficiente > 4 estejam com dados corretos
-- Esperado: ZOT 06, ZOT 07, ZOT 08, ZOT 08.1, ZOT 08.2, ZOT 08.3, ZOT 11, ZOT 12 e ZOT 13

-- Verificar estado atual
SELECT nome, coeficiente_basico, coeficiente_maximo 
FROM zot 
WHERE nome IN ('ZOT 06', 'ZOT 07', 'ZOT 08', 'ZOT 08.1', 'ZOT 08.2', 'ZOT 08.3', 'ZOT 11', 'ZOT 12', 'ZOT 13')
ORDER BY nome;

-- Atualizar ZOTs que devem ter coeficiente máximo > 4
UPDATE zot SET coeficiente_maximo = 4.5 WHERE nome = 'ZOT 06' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 6.5 WHERE nome = 'ZOT 07' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 5.0 WHERE nome = 'ZOT 08' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 7.5 WHERE nome = 'ZOT 08.1' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 6.0 WHERE nome = 'ZOT 08.2' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 7.5 WHERE nome = 'ZOT 08.3' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 5.5 WHERE nome = 'ZOT 11' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 6.0 WHERE nome = 'ZOT 12' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);
UPDATE zot SET coeficiente_maximo = 5.0 WHERE nome = 'ZOT 13' AND (coeficiente_maximo IS NULL OR coeficiente_maximo <= 4);

-- Verificar resultado
SELECT nome, coeficiente_basico, coeficiente_maximo 
FROM zot 
WHERE coeficiente_maximo > 4
ORDER BY nome;