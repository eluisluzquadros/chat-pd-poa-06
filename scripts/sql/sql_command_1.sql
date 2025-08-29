CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
ON document_embeddings USING gin(chunk_metadata);