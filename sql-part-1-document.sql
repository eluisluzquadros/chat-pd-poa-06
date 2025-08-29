-- PARTE 1: Setup do Documento
-- Execute esta parte primeiro

-- Remover documento anterior
DELETE FROM document_embeddings WHERE document_id IN (
  SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx'
);
DELETE FROM documents WHERE name = 'PDPOA2025-QA.docx';

-- Inserir novo documento
INSERT INTO documents (id, name, storage_path, type, status, metadata) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  'PDPOA2025-QA.docx',
  'local/PDPOA2025-QA-1753984953027.docx',
  'Q&A',
  'processed',
  '{"size":331287,"processed_at":"2025-07-31T18:02:33.026Z","total_chars":53618}'::jsonb
);

-- Verificar inserção
SELECT id, name, status FROM documents WHERE id = '30014c0a-3b55-42a2-a22c-e8f4090d5591';