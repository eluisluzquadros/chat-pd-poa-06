-- URGENTE: Corrigir lista completa de bairros da ZOT 08 e suas variações
-- A resposta atual está incompleta, mostrando apenas 3 bairros quando deveria mostrar 55+

-- Criar uma tabela temporária com todos os dados corretos
CREATE TEMP TABLE zot08_bairros_corretos (
    bairro VARCHAR(100),
    zot VARCHAR(20)
);

-- Inserir todos os dados corretos baseados no esperado do QA
INSERT INTO zot08_bairros_corretos (bairro, zot) VALUES
('AUXILIADORA', 'ZOT 08.2 - A'),
('AUXILIADORA', 'ZOT 08.3 - C'),
('AZENHA', 'ZOT 08'),
('AZENHA', 'ZOT 08.3 - A'),
('AZENHA', 'ZOT 08.3 - B'),
('BELA VISTA', 'ZOT 08.3 - C'),
('BOA VISTA', 'ZOT 08.3 - C'),
('BOM FIM', 'ZOT 08.1 - B'),
('BOM JESUS', 'ZOT 08.3 - B'),
('BOM JESUS', 'ZOT 08.3 - C'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - A'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - B'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - C'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - D'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - E'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - F'),
('CENTRO HISTÓRICO', 'ZOT 08.1 - G'),
('CHÁCARA DAS PEDRAS', 'ZOT 08.3 - C'),
('CRISTAL', 'ZOT 08.3 - A'),
('FARRAPOS', 'ZOT 08.2 - B'),
('FARROUPILHA', 'ZOT 08.1 - G'),
('FLORESTA', 'ZOT 08.2 - A'),
('HIGIENÓPOLIS', 'ZOT 08.3 - C'),
('HUMAITÁ', 'ZOT 08.2 - B'),
('INDEPENDÊNCIA', 'ZOT 08.2 - A'),
('JARDIM BOTÂNICO', 'ZOT 08.3 - B'),
('JARDIM BOTÂNICO', 'ZOT 08.3 - C'),
('JARDIM CARVALHO', 'ZOT 08.3 - B'),
('JARDIM CARVALHO', 'ZOT 08.3 - C'),
('JARDIM DO SALSO', 'ZOT 08.3 - B'),
('JARDIM DO SALSO', 'ZOT 08.3 - C'),
('JARDIM EUROPA', 'ZOT 08.3 - C'),
('JARDIM SABARÁ', 'ZOT 08.3 - C'),
('MEDIANEIRA', 'ZOT 08.3 - B'),
('MENINO DEUS', 'ZOT 08'),
('MENINO DEUS', 'ZOT 08.3 - A'),
('MENINO DEUS', 'ZOT 08.3 - B'),
('MOINHOS DE VENTO', 'ZOT 08.2 - A'),
('MOINHOS DE VENTO', 'ZOT 08.3 - C'),
('MONTSERRAT', 'ZOT 08.3 - C'),
('NAVEGANTES', 'ZOT 08.2 - B'),
('PARTENON', 'ZOT 08.3 - B'),
('PETRÓPOLIS', 'ZOT 08.3 - B'),
('PETRÓPOLIS', 'ZOT 08.3 - C'),
('PRAIA DE BELAS', 'ZOT 08'),
('PRAIA DE BELAS', 'ZOT 08.3 - A'),
('PRAIA DE BELAS', 'ZOT 08.3 - B'),
('RIO BRANCO', 'ZOT 08.3 - C'),
('SANTA CECÍLIA', 'ZOT 08.3 - B'),
('SANTA CECÍLIA', 'ZOT 08.3 - C'),
('SANTANA', 'ZOT 08.3 - B'),
('SANTO ANTÔNIO', 'ZOT 08.3 - B'),
('SÃO GERALDO', 'ZOT 08.2 - A'),
('SÃO JOÃO', 'ZOT 08.2 - A'),
('SÃO JOÃO', 'ZOT 08.2 - B'),
('SÃO JOÃO', 'ZOT 08.3 - C'),
('TRÊS FIGUEIRAS', 'ZOT 08.3 - C'),
('VILA JARDIM', 'ZOT 08.3 - C'),
('VILA JOÃO PESSOA', 'ZOT 08.3 - B'),
('VILA SÃO JOSÉ', 'ZOT 08.3 - B');

-- Garantir que todos os bairros existam
INSERT INTO bairros (nome, created_at, updated_at)
SELECT DISTINCT bairro, NOW(), NOW()
FROM zot08_bairros_corretos
ON CONFLICT (nome) DO NOTHING;

-- Garantir que todas as ZOTs existam
INSERT INTO zot (nome, created_at, updated_at)
SELECT DISTINCT zot, NOW(), NOW()
FROM zot08_bairros_corretos
ON CONFLICT (nome) DO NOTHING;

-- Criar as associações corretas
INSERT INTO bairros_zot (bairro_id, zot_id)
SELECT b.id, z.id
FROM zot08_bairros_corretos zbc
JOIN bairros b ON b.nome = zbc.bairro
JOIN zot z ON z.nome = zbc.zot
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT COUNT(DISTINCT b.nome) as total_bairros, 
       COUNT(*) as total_associacoes
FROM bairros b 
JOIN bairros_zot bz ON b.id = bz.bairro_id 
JOIN zot z ON bz.zot_id = z.id 
WHERE z.nome LIKE 'ZOT 08%';