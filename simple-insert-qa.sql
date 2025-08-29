-- INSERÇÃO SIMPLIFICADA DO PDPOA2025-QA.docx
-- Execute este SQL no Supabase SQL Editor

-- 1. Limpar dados anteriores
DELETE FROM document_embeddings WHERE document_id IN (
  SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx'
);
DELETE FROM documents WHERE name = 'PDPOA2025-QA.docx';

-- 2. Inserir documento
INSERT INTO documents (name, storage_path, type, status, metadata) VALUES (
  'PDPOA2025-QA.docx',
  'local/PDPOA2025-QA.docx',
  'Q&A',
  'processed',
  '{"total_chunks": 5, "simplified": true, "processed_at": "2025-01-31"}'::jsonb
) RETURNING id;

-- 3. Inserir chunks principais (apenas 5 mais importantes)
-- Você precisará do ID retornado acima para substituir em DOCUMENT_ID_HERE

-- Chunk 1: Espaços públicos
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  (SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx' LIMIT 1),
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '🟨 Pergunta: O que muda na forma como Porto Alegre cuida dos seus espaços públicos? 🟩 Resposta: Pela primeira vez, o Plano Diretor propõe uma estrutura permanente e integrada para planejar, coordenar e qualificar os espaços públicos da cidade.',
  'O que muda na forma como Porto Alegre cuida dos seus espaços públicos?',
  0,
  '{"keywords": ["espaços públicos", "plano diretor", "estrutura integrada"], "has_qa": true}'::jsonb
);

-- Chunk 2: Altura e gabarito
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  (SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx' LIMIT 1),
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '🟨 Pergunta: Qual a altura máxima permitida para edificações no novo Plano Diretor? 🟩 Resposta: A altura máxima varia conforme a zona urbana. O gabarito permitido pode chegar a 52 metros em determinadas áreas, respeitando os limites de elevação estabelecidos para cada região.',
  'Qual a altura máxima permitida para edificações?',
  1,
  '{"keywords": ["altura", "gabarito", "elevação", "altura máxima", "metros", "edificação"], "has_qa": true}'::jsonb
);

-- Chunk 3: Mobilidade
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  (SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx' LIMIT 1),
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '🟨 Pergunta: Como o novo Plano Diretor vai ajudar as pessoas a perderem menos tempo no trânsito? 🟩 Resposta: O novo Plano Diretor reorganiza o crescimento da cidade para aproximar moradia, trabalho e serviços.',
  'Como o novo Plano Diretor vai ajudar com mobilidade?',
  2,
  '{"keywords": ["mobilidade", "trânsito", "transporte", "moradia"], "has_qa": true}'::jsonb
);

-- Chunk 4: Moradia
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  (SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx' LIMIT 1),
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '🟨 Pergunta: Como o novo Plano Diretor vai ajudar a reduzir o custo da moradia? 🟩 Resposta: O Plano Diretor facilita a construção de mais moradias em áreas bem localizadas, próximas ao transporte coletivo e aos empregos.',
  'Como reduzir o custo da moradia?',
  3,
  '{"keywords": ["moradia", "habitação", "custo", "construção"], "has_qa": true}'::jsonb
);

-- Chunk 5: Guaíba
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  (SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx' LIMIT 1),
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '🟨 Pergunta: Como o Guaíba vai fazer mais parte da vida das pessoas com o novo Plano Diretor? 🟩 Resposta: O Plano Diretor propõe transformar o Guaíba em protagonista da vida urbana.',
  'Como o Guaíba vai fazer parte da vida das pessoas?',
  4,
  '{"keywords": ["guaíba", "orla", "vida urbana"], "has_qa": true}'::jsonb
);

-- 4. Verificar inserção
SELECT 
  d.name,
  d.status,
  COUNT(de.id) as total_chunks
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
WHERE d.name = 'PDPOA2025-QA.docx'
GROUP BY d.id, d.name, d.status;

-- 5. Testar busca por altura
SELECT 
  content_preview,
  metadata->>'keywords' as keywords
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
WHERE d.name = 'PDPOA2025-QA.docx'
  AND (
    content ILIKE '%altura%' OR
    content ILIKE '%gabarito%' OR
    metadata->>'keywords' LIKE '%altura%'
  );