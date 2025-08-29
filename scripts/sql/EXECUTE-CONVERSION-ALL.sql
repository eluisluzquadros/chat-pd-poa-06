-- EXECUTAR CONVERSÃO PARA TODOS OS DOCUMENTOS
-- Execute este SQL no Supabase Dashboard

-- 1. Criar função de conversão completa (sem limite)
CREATE OR REPLACE FUNCTION convert_all_embeddings_now()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  vec float[];
  converted_count int := 0;
  error_count int := 0;
BEGIN
  RAISE NOTICE 'Iniciando conversão de TODOS os embeddings...';
  
  -- Processar TODOS os documentos
  FOR r IN 
    SELECT id, embedding::text as emb_text 
    FROM document_sections 
    WHERE embedding IS NOT NULL
  LOOP
    BEGIN
      -- Converter string JSON para array de floats
      vec := ARRAY(
        SELECT unnest(
          string_to_array(
            trim(both '[]' from r.emb_text), 
            ','
          )::float[]
        )
      );
      
      -- Verificar se tem 1536 dimensões
      IF array_length(vec, 1) = 1536 THEN
        -- Atualizar com vector real
        UPDATE document_sections 
        SET embedding = vec::vector
        WHERE id = r.id;
        
        converted_count := converted_count + 1;
        
        -- Log a cada 50 conversões
        IF converted_count % 50 = 0 THEN
          RAISE NOTICE 'Já convertidos % documentos...', converted_count;
        END IF;
      ELSE
        RAISE NOTICE 'AVISO: Doc % tem % dimensões (esperado 1536)', r.id, array_length(vec, 1);
        error_count := error_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERRO no doc %: %', r.id, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ CONVERSÃO COMPLETA!';
  RAISE NOTICE 'Convertidos com sucesso: %', converted_count;
  RAISE NOTICE 'Erros: %', error_count;
END;
$$;

-- 2. EXECUTAR A CONVERSÃO
SELECT convert_all_embeddings_now();

-- 3. Verificar resultado
SELECT 
  COUNT(*) as total_docs,
  COUNT(CASE WHEN pg_typeof(embedding) = 'vector'::regtype THEN 1 END) as vectors_corretos,
  COUNT(CASE WHEN pg_typeof(embedding) != 'vector'::regtype THEN 1 END) as ainda_incorretos
FROM document_sections
WHERE embedding IS NOT NULL;

-- 4. Testar busca vetorial
WITH test_embedding AS (
  SELECT embedding 
  FROM document_sections 
  WHERE embedding IS NOT NULL 
    AND pg_typeof(embedding) = 'vector'::regtype
  LIMIT 1
)
SELECT 
  ds.id,
  substring(ds.content, 1, 100) as content_preview,
  1 - (ds.embedding <=> te.embedding) as similarity
FROM document_sections ds, test_embedding te
WHERE ds.embedding IS NOT NULL
  AND pg_typeof(ds.embedding) = 'vector'::regtype
ORDER BY ds.embedding <=> te.embedding
LIMIT 5;

-- 5. Se ainda houver problemas, verificar um exemplo
SELECT 
  id,
  pg_typeof(embedding) as tipo,
  substring(embedding::text, 1, 50) as preview
FROM document_sections
WHERE embedding IS NOT NULL
LIMIT 5;