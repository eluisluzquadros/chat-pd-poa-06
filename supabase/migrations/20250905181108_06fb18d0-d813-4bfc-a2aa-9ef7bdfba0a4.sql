-- Corrigir função search_knowledgebase_by_content
DROP FUNCTION IF EXISTS public.search_knowledgebase_by_content(text, text, integer);

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
  relevance_score numeric
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
        WHEN k.texto ILIKE '%' || search_text || '%' THEN 0.8::numeric
        WHEN k.titulo ILIKE '%' || search_text || '%' THEN 0.7::numeric
        WHEN k.pergunta ILIKE '%' || search_text || '%' THEN 0.6::numeric
        WHEN k.resposta ILIKE '%' || search_text || '%' THEN 0.5::numeric
        ELSE 0.3::numeric
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