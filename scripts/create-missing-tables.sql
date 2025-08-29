-- Criar tabela document_sections se não existir
CREATE TABLE IF NOT EXISTS document_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para document_sections
CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
  ON document_sections USING gin(to_tsvector('portuguese', content));

CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
  ON document_sections USING gin(metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_document_sections_source 
  ON document_sections((metadata->>'source_file'));

CREATE INDEX IF NOT EXISTS idx_document_sections_type 
  ON document_sections((metadata->>'type'));

-- Criar índice para busca vetorial (requer extensão vector)
CREATE INDEX IF NOT EXISTS idx_document_sections_embedding 
  ON document_sections USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Verificar e corrigir estrutura da tabela regime_urbanistico
-- A tabela já existe mas vamos adicionar colunas faltantes se necessário
DO $$ 
BEGIN
  -- Adicionar coluna id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'regime_urbanistico' 
                AND column_name = 'id') THEN
    ALTER TABLE regime_urbanistico ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
  
  -- Adicionar coluna created_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'regime_urbanistico' 
                AND column_name = 'created_at') THEN
    ALTER TABLE regime_urbanistico ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Verificar estrutura das tabelas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('document_sections', 'regime_urbanistico')
ORDER BY table_name, ordinal_position;