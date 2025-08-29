-- Criar tabela legal_articles
CREATE TABLE IF NOT EXISTS legal_articles (
  id SERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  article_number INTEGER NOT NULL,
  full_content TEXT NOT NULL,
  article_text TEXT,
  keywords TEXT[],
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, article_number)
);
