CREATE INDEX IF NOT EXISTS idx_chunk_metadata_4th_district 
ON document_embeddings((chunk_metadata->>'has4thDistrict'));