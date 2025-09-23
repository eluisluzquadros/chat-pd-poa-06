-- Função RPC para busca por similaridade na knowledgebase
CREATE OR REPLACE FUNCTION public.match_knowledgebase(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10,
  tipo_documento_filter text DEFAULT NULL
)
RETURNS TABLE(
  id text,
  tipo_documento text,
  titulo text,
  parte text,
  capitulo text,
  secao text,
  subsecao text,
  texto text,
  pergunta text,
  resposta text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.tipo_documento,
    k.titulo,
    k.parte,
    k.capitulo,
    k.secao,
    k.subsecao,
    k.texto,
    k.pergunta,
    k.resposta,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledgebase k
  WHERE 
    k.embedding IS NOT NULL
    AND (tipo_documento_filter IS NULL OR k.tipo_documento = tipo_documento_filter)
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para busca textual na knowledgebase (fallback)
CREATE OR REPLACE FUNCTION public.search_knowledgebase_by_content(
  search_text text,
  tipo_documento_filter text DEFAULT NULL,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id text,
  tipo_documento text,
  titulo text,
  parte text,
  capitulo text,
  secao text,
  subsecao text,
  texto text,
  pergunta text,
  resposta text,
  relevance_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.tipo_documento,
    k.titulo,
    k.parte,
    k.capitulo,
    k.secao,
    k.subsecao,
    k.texto,
    k.pergunta,
    k.resposta,
    (
      CASE 
        WHEN k.texto ILIKE '%' || search_text || '%' THEN 0.8
        WHEN k.titulo ILIKE '%' || search_text || '%' THEN 0.7
        WHEN k.pergunta ILIKE '%' || search_text || '%' THEN 0.6
        WHEN k.resposta ILIKE '%' || search_text || '%' THEN 0.5
        ELSE 0.3
      END
    ) AS relevance_score
  FROM knowledgebase k
  WHERE 
    (tipo_documento_filter IS NULL OR k.tipo_documento = tipo_documento_filter)
    AND (
      k.texto ILIKE '%' || search_text || '%' OR
      k.titulo ILIKE '%' || search_text || '%' OR
      k.pergunta ILIKE '%' || search_text || '%' OR
      k.resposta ILIKE '%' || search_text || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT match_count;
END;
$$;

-- Função para buscar artigos específicos na knowledgebase
CREATE OR REPLACE FUNCTION public.search_articles_knowledgebase(
  article_number_search text,
  document_type_filter text DEFAULT NULL
)
RETURNS TABLE(
  id text,
  tipo_documento text,
  titulo text,
  texto text,
  article_number_extracted integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  art_num INTEGER;
BEGIN
  -- Tentar extrair número do artigo
  art_num := COALESCE(
    NULLIF(regexp_replace(article_number_search, '[^0-9]', '', 'g'), '')::INTEGER,
    0
  );
  
  RETURN QUERY
  SELECT 
    k.id,
    k.tipo_documento,
    k.titulo,
    k.texto,
    art_num AS article_number_extracted
  FROM knowledgebase k
  WHERE 
    (document_type_filter IS NULL OR k.tipo_documento = document_type_filter)
    AND (
      k.texto ~ ('(?i)art(?:igo)?\.?\s*' || art_num || '[^0-9]') OR
      k.texto ~ ('(?i)artigo\s+' || art_num) OR
      k.titulo ~ ('(?i)art(?:igo)?\.?\s*' || art_num)
    )
  ORDER BY 
    CASE 
      WHEN k.texto ~ ('(?i)^art(?:igo)?\.?\s*' || art_num || '[^0-9]') THEN 1
      WHEN k.titulo ~ ('(?i)art(?:igo)?\.?\s*' || art_num) THEN 2
      ELSE 3
    END
  LIMIT 10;
END;
$$;