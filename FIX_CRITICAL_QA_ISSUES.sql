-- Verificar dados do bairro Cristal
SELECT b.nome as bairro, z.nome as zot, z.coeficiente_basico, z.coeficiente_maximo 
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE b.nome = 'CRISTAL' 
ORDER BY z.nome;

-- Calcular índice de aproveitamento médio do Cristal
SELECT 
    b.nome as bairro,
    AVG((z.coeficiente_basico + z.coeficiente_maximo) / 2) as indice_aproveitamento_medio
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE b.nome = 'CRISTAL'
GROUP BY b.nome;

-- Verificar ZOTs com coeficiente de aproveitamento maior que 4
SELECT DISTINCT z.nome as zot, z.coeficiente_maximo
FROM zot z
WHERE z.coeficiente_maximo > 4
ORDER BY z.nome;

-- Verificar dados do bairro Três Figueiras
SELECT b.nome as bairro, z.nome as zot, z.coeficiente_basico, z.coeficiente_maximo, z.altura_maxima
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE b.nome = 'TRÊS FIGUEIRAS' 
ORDER BY z.nome;

-- Listar todos os bairros da ZOT 08 e suas variações
SELECT b.nome as bairro, z.nome as zot
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE z.nome LIKE 'ZOT 08%'
ORDER BY z.nome, b.nome;