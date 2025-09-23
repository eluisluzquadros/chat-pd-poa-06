-- SOLUÇÃO DEFINITIVA: Converter strings JSON para vetores
-- Execute este SQL no Supabase Dashboard

-- 1. Criar função para converter string JSON em vector
CREATE OR REPLACE FUNCTION convert_string_to_vector()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  vec float[];
BEGIN
  -- Loop através de todos os documentos
  FOR r IN 
    SELECT id, embedding::text as emb_text 
    FROM document_sections 
    WHERE embedding IS NOT NULL
    LIMIT 10 -- Testar com 10 primeiro
  LOOP
    BEGIN
      -- Converter string JSON para array
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
        -- Atualizar com vector
        UPDATE document_sections 
        SET embedding = vec::vector
        WHERE id = r.id;
        
        RAISE NOTICE 'Convertido doc %', r.id;
      ELSE
        RAISE NOTICE 'Doc % tem % dimensões, pulando', r.id, array_length(vec, 1);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro no doc %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 2. Executar a conversão para 10 documentos de teste
SELECT convert_string_to_vector();

-- 3. Verificar se funcionou
SELECT 
  id,
  pg_typeof(embedding) as tipo,
  octet_length(embedding::text) as tamanho_texto,
  array_length(embedding::float[], 1) as dimensoes_array
FROM document_sections
WHERE embedding IS NOT NULL
LIMIT 10;

-- 4. Se funcionou, criar versão para converter TODOS
CREATE OR REPLACE FUNCTION convert_all_embeddings()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  vec float[];
  converted_count int := 0;
  error_count int := 0;
BEGIN
  RAISE NOTICE 'Iniciando conversão de todos os embeddings...';
  
  FOR r IN 
    SELECT id, embedding::text as emb_text 
    FROM document_sections 
    WHERE embedding IS NOT NULL
  LOOP
    BEGIN
      -- Converter string JSON para array
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
        -- Atualizar com vector
        UPDATE document_sections 
        SET embedding = vec::vector
        WHERE id = r.id;
        
        converted_count := converted_count + 1;
        
        -- Log a cada 50 conversões
        IF converted_count % 50 = 0 THEN
          RAISE NOTICE 'Convertidos % documentos...', converted_count;
        END IF;
      ELSE
        RAISE NOTICE 'Doc % tem % dimensões incorretas', r.id, array_length(vec, 1);
        error_count := error_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro no doc %: %', r.id, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE 'Conversão completa! Convertidos: %, Erros: %', converted_count, error_count;
END;
$$;

-- 5. Para converter TODOS, descomente e execute:
-- SELECT convert_all_embeddings();

-- 6. Verificação final
SELECT 
  COUNT(*) as total,
  pg_typeof(embedding) as tipo
FROM document_sections
WHERE embedding IS NOT NULL
GROUP BY pg_typeof(embedding);