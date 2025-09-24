-- URGENTE: Corrigir dados do bairro Três Figueiras
-- O bairro deve ter ZOT 04, ZOT 07 e ZOT 08.3-C com parâmetros específicos

-- 1. Verificar se o bairro existe
SELECT * FROM bairros WHERE nome = 'TRÊS FIGUEIRAS';

-- 2. Verificar/criar as ZOTs necessárias
-- ZOT 04: Coef. Básico 2.0, Máximo 4.0, Altura 18m
INSERT INTO zot (nome, coeficiente_basico, coeficiente_maximo, altura_maxima, created_at, updated_at)
VALUES ('ZOT 04', 2.0, 4.0, 18, NOW(), NOW())
ON CONFLICT (nome) DO UPDATE SET
    coeficiente_basico = 2.0,
    coeficiente_maximo = 4.0,
    altura_maxima = 18;

-- ZOT 07: Coef. Básico 3.6, Máximo 6.5, Altura 60m
INSERT INTO zot (nome, coeficiente_basico, coeficiente_maximo, altura_maxima, created_at, updated_at)
VALUES ('ZOT 07', 3.6, 6.5, 60, NOW(), NOW())
ON CONFLICT (nome) DO UPDATE SET
    coeficiente_basico = 3.6,
    coeficiente_maximo = 6.5,
    altura_maxima = 60;

-- ZOT 08.3 - C: Coef. Básico 3.6, Máximo 7.5, Altura 90m
INSERT INTO zot (nome, coeficiente_basico, coeficiente_maximo, altura_maxima, created_at, updated_at)
VALUES ('ZOT 08.3 - C', 3.6, 7.5, 90, NOW(), NOW())
ON CONFLICT (nome) DO UPDATE SET
    coeficiente_basico = 3.6,
    coeficiente_maximo = 7.5,
    altura_maxima = 90;

-- 3. Criar as associações bairro-zot
-- Limpar associações antigas incorretas
DELETE FROM bairros_zot 
WHERE bairro_id = (SELECT id FROM bairros WHERE nome = 'TRÊS FIGUEIRAS');

-- Inserir as associações corretas
INSERT INTO bairros_zot (bairro_id, zot_id)
SELECT b.id, z.id
FROM bairros b, zot z
WHERE b.nome = 'TRÊS FIGUEIRAS' 
AND z.nome IN ('ZOT 04', 'ZOT 07', 'ZOT 08.3 - C')
ON CONFLICT DO NOTHING;

-- 4. Verificar resultado
SELECT 
    b.nome as bairro,
    z.nome as zot,
    z.coeficiente_basico,
    z.coeficiente_maximo,
    z.altura_maxima
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE b.nome = 'TRÊS FIGUEIRAS'
ORDER BY z.nome;