-- =====================================================
-- CORRIGIR ESTRUTURA DA TABELA legal_articles
-- =====================================================

-- Verificar estrutura atual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'legal_articles';

-- Se a coluna 'content' não existir, adicionar
ALTER TABLE legal_articles 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Se a coluna 'embedding' não existir com o tipo correto
ALTER TABLE legal_articles 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Se a coluna 'metadata' não existir
ALTER TABLE legal_articles 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Verificar estrutura após alterações
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'legal_articles'
ORDER BY ordinal_position;