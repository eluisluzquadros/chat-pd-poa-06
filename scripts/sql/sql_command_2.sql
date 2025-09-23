CREATE INDEX IF NOT EXISTS idx_chunk_metadata_type 
ON document_embeddings((chunk_metadata->>'type'));