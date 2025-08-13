-- REBUILD COMPLETO DA TABELA document_sections
-- Execute este SQL no Supabase Dashboard

-- 1. Dropar função antiga primeiro
DROP FUNCTION IF EXISTS match_document_sections(vector, float, int);
DROP FUNCTION IF EXISTS match_document_sections(vector(1536), float, int);

-- 2. Fazer backup dos dados importantes
CREATE TABLE IF NOT EXISTS document_sections_backup AS 
SELECT id, content, metadata, created_at, updated_at 
FROM document_sections;

-- 3. Deletar tabela antiga
DROP TABLE IF EXISTS document_sections CASCADE;

-- 4. Criar tabela nova com estrutura correta
CREATE TABLE document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Criar índices
CREATE INDEX document_sections_embedding_idx 
ON document_sections 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX document_sections_metadata_idx 
ON document_sections 
USING gin (metadata);

-- 6. Criar função de busca vetorial (com tipo de retorno correto)
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.content,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding) AS similarity
  FROM document_sections ds
  WHERE ds.embedding IS NOT NULL
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Criar função auxiliar para salvar embeddings corretamente
CREATE OR REPLACE FUNCTION update_document_embedding(
  doc_id uuid,
  new_embedding float[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE document_sections 
  SET embedding = new_embedding::vector,
      updated_at = now()
  WHERE id = doc_id;
END;
$$;

-- 8. Habilitar RLS
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas
CREATE POLICY "Permitir leitura pública" 
ON document_sections FOR SELECT 
USING (true);

CREATE POLICY "Permitir insert para service role" 
ON document_sections FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir update para service role" 
ON document_sections FOR UPDATE 
USING (true);

-- 10. Verificar se tudo foi criado corretamente
SELECT 
  'Tabela criada' as status,
  count(*) as registros 
FROM document_sections;

-- Verificar tipo da coluna embedding
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
AND column_name = 'embedding';
-- Deve mostrar: udt_name = 'vector'