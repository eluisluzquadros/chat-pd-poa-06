-- =====================================================
-- CORREÇÃO DE DUPLICAÇÕES DE CONTEÚDO EM LEGAL_ARTICLES
-- =====================================================

-- Função para remover duplicações de parágrafos no conteúdo
CREATE OR REPLACE FUNCTION remove_content_duplications()
RETURNS TABLE(
  id integer,
  original_length integer,
  new_length integer,
  duplications_removed integer
) 
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  cleaned_content TEXT;
  original_length INTEGER;
  new_length INTEGER;
  duplications_count INTEGER := 0;
BEGIN
  -- Criar tabela de backup se não existir
  CREATE TABLE IF NOT EXISTS legal_articles_backup_content AS
  SELECT * FROM legal_articles WHERE 1=0;
  
  -- Iterar pelos artigos que têm duplicações
  FOR rec IN 
    SELECT la.id, la.full_content, la.document_type, la.article_number
    FROM legal_articles la
    WHERE la.article_number < 9000  -- Apenas artigos reais
      AND (
        la.full_content ~ '\*\*§ \d+\*\*.*\n\n\*\*§ \d+\*\*.*' OR  -- Parágrafos numerados duplicados
        la.full_content ~ '\*\*Parágrafo único\*\*.*\n\n\*\*Parágrafo único\*\*.*' -- Parágrafo único duplicado
      )
  LOOP
    -- Fazer backup do registro original
    INSERT INTO legal_articles_backup_content 
    SELECT * FROM legal_articles WHERE legal_articles.id = rec.id;
    
    original_length := LENGTH(rec.full_content);
    cleaned_content := rec.full_content;
    
    -- Remover duplicações de parágrafos numerados (§ 1, § 2, etc.)
    -- Pattern: **§ X** ... seguido de **§ X** ...
    WHILE cleaned_content ~ '(\*\*§ (\d+)\*\*[^*]*?)(\n\n\*\*§ \2\*\*[^*]*?)' LOOP
      cleaned_content := regexp_replace(
        cleaned_content,
        '(\*\*§ (\d+)\*\*[^*]*?)(\n\n\*\*§ \2\*\*[^*]*?)',
        '\1',
        'g'
      );
      duplications_count := duplications_count + 1;
    END LOOP;
    
    -- Remover duplicações de "Parágrafo único"
    WHILE cleaned_content ~ '(\*\*Parágrafo único\*\*[^*]*?)(\n\n\*\*Parágrafo único\*\*[^*]*?)' LOOP
      cleaned_content := regexp_replace(
        cleaned_content,
        '(\*\*Parágrafo único\*\*[^*]*?)(\n\n\*\*Parágrafo único\*\*[^*]*?)',
        '\1',
        'g'
      );
      duplications_count := duplications_count + 1;
    END LOOP;
    
    new_length := LENGTH(cleaned_content);
    
    -- Atualizar apenas se houve mudanças
    IF original_length != new_length THEN
      UPDATE legal_articles 
      SET 
        full_content = cleaned_content,
        updated_at = NOW()
      WHERE legal_articles.id = rec.id;
      
      -- Retornar informações sobre a correção
      RETURN QUERY SELECT 
        rec.id,
        original_length,
        new_length,
        duplications_count;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Executar a correção e ver os resultados
SELECT * FROM remove_content_duplications();

-- Verificar quantos registros ainda têm duplicações
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE 
    WHEN la.full_content ~ '\*\*§ \d+\*\*.*\n\n\*\*§ \d+\*\*.*' OR 
         la.full_content ~ '\*\*Parágrafo único\*\*.*\n\n\*\*Parágrafo único\*\*.*' 
    THEN 1 
  END) as articles_with_duplications
FROM legal_articles la
WHERE la.article_number < 9000;

-- Criar índice para melhorar performance de buscas por conteúdo
CREATE INDEX IF NOT EXISTS idx_legal_articles_content_search 
ON legal_articles USING gin(to_tsvector('portuguese', full_content))
WHERE article_number < 9000;