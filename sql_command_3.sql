CREATE INDEX IF NOT EXISTS idx_chunk_metadata_article 
ON document_embeddings((chunk_metadata->>'articleNumber'));