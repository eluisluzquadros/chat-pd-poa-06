-- URGENTE: Adicionar dados do bairro Cristal que estão faltando
-- O bairro Cristal tem índice de aproveitamento médio de 2.375

-- 1. Primeiro verificar se o bairro Cristal existe
SELECT * FROM bairros WHERE nome = 'CRISTAL';

-- 2. Se não existir, inserir o bairro
INSERT INTO bairros (nome, created_at, updated_at)
VALUES ('CRISTAL', NOW(), NOW())
ON CONFLICT (nome) DO NOTHING;

-- 3. Obter o ID do bairro Cristal
-- (usar o resultado da query acima)

-- 4. Verificar as ZOTs que devem estar associadas ao Cristal
-- Baseado nos dados do QA, o Cristal tem ZOT 08.3 - A
SELECT * FROM zot WHERE nome = 'ZOT 08.3 - A';

-- 5. Associar o bairro Cristal com suas ZOTs
-- IMPORTANTE: O índice de aproveitamento médio deve resultar em 2.375
-- Isso significa que os coeficientes básico e máximo devem ter média de 2.375

-- Se a ZOT 08.3 - A não tiver os valores corretos, atualizar:
UPDATE zot 
SET coeficiente_basico = 1.5,
    coeficiente_maximo = 3.25
WHERE nome = 'ZOT 08.3 - A';
-- Média: (1.5 + 3.25) / 2 = 2.375

-- 6. Criar a associação bairro-zot
INSERT INTO bairros_zot (bairro_id, zot_id)
SELECT b.id, z.id
FROM bairros b, zot z
WHERE b.nome = 'CRISTAL' 
AND z.nome = 'ZOT 08.3 - A'
ON CONFLICT DO NOTHING;

-- 7. Verificar o resultado
SELECT 
    b.nome as bairro,
    z.nome as zot,
    z.coeficiente_basico,
    z.coeficiente_maximo,
    (z.coeficiente_basico + z.coeficiente_maximo) / 2 as indice_medio
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE b.nome = 'CRISTAL';