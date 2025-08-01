-- SQL CORRIGIDO - Sistema RAG Otimizado
-- Execute este SQL no Supabase Dashboard: SQL Editor

-- 1. Adicionar coluna chunk_metadata se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_embeddings' 
    AND column_name = 'chunk_metadata'
  ) THEN
    ALTER TABLE document_embeddings 
    ADD COLUMN chunk_metadata jsonb;
  END IF;
END $$;

-- 2. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_chunk_metadata 
ON document_embeddings USING gin(chunk_metadata);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id 
ON document_embeddings(document_id);

-- 3. Tabela de cache de queries
CREATE TABLE IF NOT EXISTS query_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL UNIQUE,
  embedding vector(1536),
  results jsonb,
  created_at timestamp with time zone DEFAULT now(),
  hit_count integer DEFAULT 0,
  last_accessed timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_query 
ON query_cache(query);

-- 4. Função match_documents CORRIGIDA
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_count integer,
  document_ids text[] -- Mudado para text[] para aceitar ambos os tipos
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  document_id bigint, -- Mantendo bigint como no banco
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
      ELSE de.document_id::text = ANY(document_ids) -- Conversão para text
    END
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 5. Função match_hierarchical_documents CORRIGIDA
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids text[], -- Mudado para text[]
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision,
  document_id bigint -- Adicionando document_id no retorno
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base_matches AS (
    SELECT
      de.content_chunk,
      1 - (de.embedding <=> query_embedding) as base_similarity,
      de.chunk_metadata,
      de.document_id
    FROM document_embeddings de
    WHERE 
      CASE 
        WHEN array_length(document_ids, 1) IS NULL THEN true
        ELSE de.document_id::text = ANY(document_ids) -- Conversão para text
      END
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      bm.document_id,
      CASE
        -- Boost máximo para 4º distrito + Art. 74
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND bm.chunk_metadata->>'articleNumber' = '74' 
          AND lower(query_text) LIKE '%4º distrito%' 
        THEN bm.base_similarity * 2.0
        
        -- Boost alto para certificação
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%')
        THEN bm.base_similarity * 1.8
        
        -- Boost para match de artigo específico
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND (lower(query_text) LIKE '%art. ' || (bm.chunk_metadata->>'articleNumber') || '%'
            OR lower(query_text) LIKE '%artigo ' || (bm.chunk_metadata->>'articleNumber') || '%')
        THEN bm.base_similarity * 1.5
        
        -- Boost para keywords importantes
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
    LEAST(sm.boosted_score, 1.0) as boosted_score,
    sm.document_id
  FROM scored_matches sm
  ORDER BY sm.boosted_score DESC
  LIMIT match_count;
END;
$$;

-- 6. Tabela de riscos de desastre
CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
  id SERIAL PRIMARY KEY,
  bairro_nome TEXT NOT NULL,
  bairro_nome_normalizado TEXT GENERATED ALWAYS AS (
    UPPER(UNACCENT(TRIM(bairro_nome)))
  ) STORED,
  risco_inundacao BOOLEAN DEFAULT FALSE,
  risco_deslizamento BOOLEAN DEFAULT FALSE,
  risco_desmoronamento BOOLEAN DEFAULT FALSE,
  nivel_risco TEXT CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'muito_alto')),
  descricao_risco TEXT,
  fonte_dados TEXT,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  geometria GEOMETRY(Polygon, 4326),
  populacao_afetada INTEGER,
  historico_ocorrencias JSONB,
  medidas_preventivas TEXT[],
  contato_defesa_civil TEXT
);

CREATE INDEX IF NOT EXISTS idx_bairro_nome_normalizado 
ON bairros_risco_desastre(bairro_nome_normalizado);

CREATE INDEX IF NOT EXISTS idx_nivel_risco 
ON bairros_risco_desastre(nivel_risco);

-- 7. Inserir dados de risco (se não existirem)
INSERT INTO bairros_risco_desastre (
  bairro_nome, 
  risco_inundacao, 
  risco_deslizamento, 
  nivel_risco, 
  descricao_risco,
  fonte_dados
) 
SELECT * FROM (VALUES
  ('Navegantes', true, false, 'alto', 'Área de várzea do Guaíba, inundações recorrentes', 'Plano Diretor 2024'),
  ('Humaitá', true, false, 'alto', 'Proximidade ao Guaíba, alagamentos frequentes', 'Plano Diretor 2024'),
  ('Ilhas', true, false, 'muito_alto', 'Área insular, totalmente suscetível a cheias', 'Plano Diretor 2024'),
  ('Farrapos', true, false, 'medio', 'Áreas baixas com drenagem deficiente', 'Plano Diretor 2024'),
  ('São João', true, false, 'medio', 'Pontos de alagamento em chuvas intensas', 'Plano Diretor 2024'),
  ('Anchieta', true, false, 'medio', 'Problemas de drenagem urbana', 'Plano Diretor 2024'),
  ('Arquipélago', true, false, 'muito_alto', 'Área de ilhas, risco extremo de inundação', 'Plano Diretor 2024'),
  ('Centro Histórico', true, false, 'medio', 'Áreas próximas ao cais com risco de alagamento', 'Plano Diretor 2024'),
  ('Floresta', true, false, 'baixo', 'Pontos isolados de alagamento', 'Plano Diretor 2024'),
  ('Marcílio Dias', true, false, 'medio', 'Proximidade a arroios, risco moderado', 'Plano Diretor 2024')
) AS dados(bairro_nome, risco_inundacao, risco_deslizamento, nivel_risco, descricao_risco, fonte_dados)
WHERE NOT EXISTS (
  SELECT 1 FROM bairros_risco_desastre
);

-- 8. Função para buscar riscos por bairro
CREATE OR REPLACE FUNCTION buscar_riscos_bairro(nome_bairro TEXT)
RETURNS TABLE(
  bairro TEXT,
  tem_risco_inundacao BOOLEAN,
  tem_risco_deslizamento BOOLEAN,
  nivel TEXT,
  descricao TEXT
)
LANGUAGE sql
AS $$
  SELECT 
    bairro_nome,
    risco_inundacao,
    risco_deslizamento,
    nivel_risco,
    descricao_risco
  FROM bairros_risco_desastre
  WHERE bairro_nome_normalizado = UPPER(UNACCENT(TRIM(nome_bairro)))
     OR bairro_nome ILIKE '%' || nome_bairro || '%';
$$;

-- 9. View para facilitar consultas de risco
CREATE OR REPLACE VIEW v_bairros_alto_risco AS
SELECT 
  bairro_nome,
  CASE 
    WHEN risco_inundacao AND risco_deslizamento THEN 'Inundação e Deslizamento'
    WHEN risco_inundacao THEN 'Inundação'
    WHEN risco_deslizamento THEN 'Deslizamento'
    ELSE 'Outros'
  END as tipo_risco,
  nivel_risco,
  descricao_risco
FROM bairros_risco_desastre
WHERE nivel_risco IN ('alto', 'muito_alto')
ORDER BY 
  CASE nivel_risco 
    WHEN 'muito_alto' THEN 1 
    WHEN 'alto' THEN 2 
  END,
  bairro_nome;

-- 10. Função para atualizar metadados dos chunks existentes
CREATE OR REPLACE FUNCTION update_chunk_metadata()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  chunk_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR chunk_record IN 
    SELECT id, content_chunk 
    FROM document_embeddings 
    WHERE chunk_metadata IS NULL
    LIMIT 1000
  LOOP
    UPDATE document_embeddings
    SET chunk_metadata = jsonb_build_object(
      'hasCertification', 
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%certificação%' 
          AND (lower(chunk_record.content_chunk) LIKE '%sustentabilidade%' 
            OR lower(chunk_record.content_chunk) LIKE '%ambiental%')
        THEN true 
        ELSE false 
      END,
      'has4thDistrict',
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%4º distrito%' 
          OR lower(chunk_record.content_chunk) LIKE '%quarto distrito%'
        THEN true 
        ELSE false 
      END,
      'hasImportantKeywords',
      CASE 
        WHEN lower(chunk_record.content_chunk) LIKE '%certificação%' 
          OR lower(chunk_record.content_chunk) LIKE '%4º distrito%'
          OR lower(chunk_record.content_chunk) LIKE '%sustentabilidade%'
          OR lower(chunk_record.content_chunk) LIKE '%zot 8.2%'
        THEN true 
        ELSE false 
      END,
      'articleNumber',
      (regexp_match(chunk_record.content_chunk, 'Art\.\s*(\d+)', 'i'))[1]
    )
    WHERE id = chunk_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % chunks with metadata', updated_count;
END;
$$;

-- Executar atualização de metadados
SELECT update_chunk_metadata();

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
  RAISE NOTICE 'SQL executado com sucesso!';
  RAISE NOTICE 'Tabelas criadas: document_embeddings, query_cache, bairros_risco_desastre';
  RAISE NOTICE 'Funções criadas: match_documents, match_hierarchical_documents, buscar_riscos_bairro';
  RAISE NOTICE 'Próximo passo: Deploy das Edge Functions';
END $$;