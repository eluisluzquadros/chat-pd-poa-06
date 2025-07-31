CREATE INDEX IF NOT EXISTS idx_chunk_metadata_certification 
ON document_embeddings((chunk_metadata->>'hasCertification'));