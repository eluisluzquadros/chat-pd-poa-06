
-- Adicionar colunas faltantes na tabela documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;
