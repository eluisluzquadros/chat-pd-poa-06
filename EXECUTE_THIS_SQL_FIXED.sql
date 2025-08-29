-- Estruturas essenciais para o sistema RAG otimizado
-- VERSÃO CORRIGIDA - Compatível com documents.id BIGINT

-- 1. Tabela document_embeddings (com document_id como BIGINT)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id SERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  embedding vector(1536),
  chunk_metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para document_embeddings
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id 
ON document_embeddings(document_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
ON document_embeddings USING gin(chunk_metadata);

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_type 
ON document_embeddings((chunk_metadata->>'type'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_article 
ON document_embeddings((chunk_metadata->>'articleNumber'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_certification 
ON document_embeddings((chunk_metadata->>'hasCertification'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_4th_district 
ON document_embeddings((chunk_metadata->>'has4thDistrict'));

-- 3. Função match_documents corrigida (sem tipo uuid[])
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_count integer,
  document_ids bigint[]
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  document_id bigint,
  chunk_metadata jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.document_id,
    de.chunk_metadata
  FROM document_embeddings de
  WHERE 
    CASE 
      WHEN array_length(document_ids, 1) IS NULL THEN true
      ELSE de.document_id = ANY(document_ids)
    END
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Função match_hierarchical_documents corrigida
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids bigint[],
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base_matches AS (
    SELECT
      de.content_chunk,
      1 - (de.embedding <=> query_embedding) as base_similarity,
      de.chunk_metadata
    FROM document_embeddings de
    WHERE 
      CASE 
        WHEN array_length(document_ids, 1) IS NULL THEN true
        ELSE de.document_id = ANY(document_ids)
      END
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      CASE
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND bm.chunk_metadata->>'articleNumber' = '74' 
          AND lower(query_text) LIKE '%4º distrito%' 
        THEN bm.base_similarity * 2.0
        
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%')
        THEN bm.base_similarity * 1.8
        
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND (lower(query_text) LIKE '%art. ' || (bm.chunk_metadata->>'articleNumber') || '%'
            OR lower(query_text) LIKE '%artigo ' || (bm.chunk_metadata->>'articleNumber') || '%')
        THEN bm.base_similarity * 1.5
        
        WHEN bm.chunk_metadata->>'hasImportantKeywords' = 'true'
        THEN bm.base_similarity * 1.2
        
        ELSE bm.base_similarity
      END as boosted_score
    FROM base_matches bm
  )
  SELECT
    sm.content_chunk,
    sm.base_similarity as similarity,
    sm.chunk_metadata,
    LEAST(sm.boosted_score, 1.0) as boosted_score
  FROM scored_matches sm
  ORDER BY sm.boosted_score DESC
  LIMIT match_count;
END;
$$;

-- 5. Tabela de riscos de desastre (sem alteração)
CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
  id SERIAL PRIMARY KEY,
  bairro_nome TEXT NOT NULL,
  bairro_nome_normalizado TEXT GENERATED ALWAYS AS (
    UPPER(TRIM(bairro_nome))
  ) STORED,
  risco_inundacao BOOLEAN DEFAULT FALSE,
  risco_deslizamento BOOLEAN DEFAULT FALSE,
  risco_alagamento BOOLEAN DEFAULT FALSE,
  risco_vendaval BOOLEAN DEFAULT FALSE,
  risco_granizo BOOLEAN DEFAULT FALSE,
  nivel_risco_geral INTEGER CHECK (nivel_risco_geral BETWEEN 1 AND 5),
  nivel_risco_inundacao INTEGER CHECK (nivel_risco_inundacao BETWEEN 0 AND 5),
  nivel_risco_deslizamento INTEGER CHECK (nivel_risco_deslizamento BETWEEN 0 AND 5),
  areas_criticas TEXT,
  observacoes TEXT,
  ultima_ocorrencia DATE,
  frequencia_anual INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bairro_nome_normalizado)
);

-- 6. Função get_riscos_bairro (sem alteração)
CREATE OR REPLACE FUNCTION get_riscos_bairro(nome_bairro TEXT)
RETURNS TABLE (
  bairro TEXT,
  riscos_ativos TEXT[],
  nivel_risco INTEGER,
  descricao_riscos TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    brd.bairro_nome,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN brd.risco_inundacao THEN 'Inundação' END,
      CASE WHEN brd.risco_deslizamento THEN 'Deslizamento' END,
      CASE WHEN brd.risco_alagamento THEN 'Alagamento' END,
      CASE WHEN brd.risco_vendaval THEN 'Vendaval' END,
      CASE WHEN brd.risco_granizo THEN 'Granizo' END
    ], NULL) as riscos_ativos,
    brd.nivel_risco_geral,
    CASE 
      WHEN brd.nivel_risco_geral = 5 THEN 'Risco Muito Alto'
      WHEN brd.nivel_risco_geral = 4 THEN 'Risco Alto'
      WHEN brd.nivel_risco_geral = 3 THEN 'Risco Médio'
      WHEN brd.nivel_risco_geral = 2 THEN 'Risco Baixo'
      WHEN brd.nivel_risco_geral = 1 THEN 'Risco Muito Baixo'
      ELSE 'Sem classificação'
    END as descricao_riscos
  FROM bairros_risco_desastre brd
  WHERE UPPER(TRIM(brd.bairro_nome)) = UPPER(TRIM(nome_bairro))
     OR brd.bairro_nome ILIKE '%' || nome_bairro || '%';
END;
$$;

-- 7. Tabela query_cache (corrigida)
CREATE TABLE IF NOT EXISTS query_cache (
  key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence FLOAT,
  category TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Verificar se vector extension está habilitada
CREATE EXTENSION IF NOT EXISTS vector;

-- 9. Inserir alguns chunks de teste para validação
INSERT INTO document_embeddings (document_id, content_chunk, embedding, chunk_metadata)
SELECT 
  d.id,
  'Art. 81. Os limites de altura máxima... III -- os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental...',
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector,
  '{
    "type": "inciso",
    "articleNumber": "81",
    "incisoNumber": "III",
    "hasCertification": true,
    "has4thDistrict": false,
    "hasImportantKeywords": true,
    "keywords": ["certificação em sustentabilidade ambiental", "altura", "acréscimos"]
  }'::jsonb
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM document_embeddings de 
  WHERE de.document_id = d.id 
  AND de.chunk_metadata->>'articleNumber' = '81'
)
LIMIT 1;

INSERT INTO document_embeddings (document_id, content_chunk, embedding, chunk_metadata)
SELECT 
  d.id,
  'Art. 74. Os empreendimentos localizados na ZOT 8.2 -- 4º Distrito, descritos no Anexo 13.4...',
  ARRAY_FILL(0.2::float, ARRAY[1536])::vector,
  '{
    "type": "article",
    "articleNumber": "74",
    "hasCertification": false,
    "has4thDistrict": true,
    "hasImportantKeywords": true,
    "keywords": ["4º distrito", "zot 8.2", "regime urbanístico", "empreendimentos"]
  }'::jsonb
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM document_embeddings de 
  WHERE de.document_id = d.id 
  AND de.chunk_metadata->>'articleNumber' = '74'
)
LIMIT 1;

-- Comentários
COMMENT ON TABLE document_embeddings IS 'Armazena chunks de documentos com embeddings vetoriais e metadados hierárquicos';
COMMENT ON TABLE bairros_risco_desastre IS 'Tabela que relaciona bairros com seus respectivos riscos de desastre natural';
COMMENT ON FUNCTION match_hierarchical_documents IS 'Busca vetorial com scoring contextual baseado em metadados hierárquicos';

-- Verificar se tudo foi criado
SELECT 
  'Tabelas criadas:' as info,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_embeddings', 'bairros_risco_desastre', 'query_cache');

SELECT 
  'Funções criadas:' as info,
  COUNT(*) as total
FROM pg_proc 
WHERE proname IN ('match_documents', 'match_hierarchical_documents', 'get_riscos_bairro');

SELECT 
  'Chunks de teste criados:' as info,
  COUNT(*) as total
FROM document_embeddings;