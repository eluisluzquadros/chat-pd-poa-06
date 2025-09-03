-- FASE 2: Função SQL robusta para correção de duplicações
CREATE OR REPLACE FUNCTION fix_content_duplications_v2()
RETURNS TABLE(
  id integer,
  original_length integer,
  new_length integer,
  duplications_removed integer,
  patterns_found text[]
) 
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  cleaned_content TEXT;
  original_length INTEGER;
  new_length INTEGER;
  duplications_count INTEGER := 0;
  patterns_found TEXT[] := '{}';
BEGIN
  -- Backup antes da operação
  CREATE TABLE IF NOT EXISTS legal_articles_backup_v2 AS
  SELECT * FROM legal_articles WHERE 1=0;
  
  FOR rec IN 
    SELECT la.id, la.full_content, la.document_type, la.article_number
    FROM legal_articles la
    WHERE la.article_number < 9000
      AND (
        la.full_content ~ '\*\*§ (\d+)\*\*.*?\n\n\*\*§ \1\*\*.*?' OR
        la.full_content ~ '\*\*Parágrafo único\*\*.*?\n\n\*\*Parágrafo único\*\*.*?' OR
        la.full_content ~ '\*\*I\s*–\*\*.*?\n\n\*\*I\s*–\*\*.*?' OR
        la.full_content ~ '\*\*II\s*–\*\*.*?\n\n\*\*II\s*–\*\*.*?' OR
        la.full_content ~ '\*\*III\s*–\*\*.*?\n\n\*\*III\s*–\*\*.*?' OR
        la.full_content ~ '\*\*IV\s*–\*\*.*?\n\n\*\*IV\s*–\*\*.*?' OR
        la.full_content ~ '\*\*V\s*–\*\*.*?\n\n\*\*V\s*–\*\*.*?' OR
        la.full_content ~ '\*\*VI\s*–\*\*.*?\n\n\*\*VI\s*–\*\*.*?' OR
        la.full_content ~ '\*\*VII\s*–\*\*.*?\n\n\*\*VII\s*–\*\*.*?' OR
        la.full_content ~ '\*\*VIII\s*–\*\*.*?\n\n\*\*VIII\s*–\*\*.*?'
      )
  LOOP
    -- Backup do registro
    INSERT INTO legal_articles_backup_v2 
    SELECT * FROM legal_articles WHERE legal_articles.id = rec.id;
    
    original_length := LENGTH(rec.full_content);
    cleaned_content := rec.full_content;
    duplications_count := 0;
    patterns_found := '{}';
    
    -- Padrão 1: Parágrafos numerados duplicados
    WHILE cleaned_content ~ '\*\*§ (\d+)\*\*([^*]*?)\*\*([^*]*?)\n\n\*\*§ \1\*\*([^*]*?)\*\*([^*]*?)' LOOP
      cleaned_content := regexp_replace(
        cleaned_content,
        '\*\*§ (\d+)\*\*([^*]*?)\*\*([^*]*?)\n\n\*\*§ \1\*\*([^*]*?)\*\*([^*]*?)',
        '**§ \1**\2**\3',
        'g'
      );
      duplications_count := duplications_count + 1;
      patterns_found := array_append(patterns_found, 'Parágrafo numerado');
    END LOOP;
    
    -- Padrão 2: Parágrafo único duplicado
    WHILE cleaned_content ~ '\*\*Parágrafo único\*\*([^*]*?)\n\n\*\*Parágrafo único\*\*([^*]*?)' LOOP
      cleaned_content := regexp_replace(
        cleaned_content,
        '\*\*Parágrafo único\*\*([^*]*?)\n\n\*\*Parágrafo único\*\*([^*]*?)',
        '**Parágrafo único**\1',
        'g'
      );
      duplications_count := duplications_count + 1;
      patterns_found := array_append(patterns_found, 'Parágrafo único');
    END LOOP;
    
    -- Padrão 3: Incisos I-VIII duplicados
    FOR i IN 1..8 LOOP
      DECLARE
        roman_num TEXT;
      BEGIN
        CASE i
          WHEN 1 THEN roman_num := 'I';
          WHEN 2 THEN roman_num := 'II';
          WHEN 3 THEN roman_num := 'III';
          WHEN 4 THEN roman_num := 'IV';
          WHEN 5 THEN roman_num := 'V';
          WHEN 6 THEN roman_num := 'VI';
          WHEN 7 THEN roman_num := 'VII';
          WHEN 8 THEN roman_num := 'VIII';
        END CASE;
        
        WHILE cleaned_content ~ concat('\*\*', roman_num, '\s*–\*\*([^*]*?)\n\n\*\*', roman_num, '\s*–\*\*([^*]*?)') LOOP
          cleaned_content := regexp_replace(
            cleaned_content,
            concat('\*\*', roman_num, '\s*–\*\*([^*]*?)\n\n\*\*', roman_num, '\s*–\*\*([^*]*?)'),
            concat('**', roman_num, ' –**\1'),
            'g'
          );
          duplications_count := duplications_count + 1;
          patterns_found := array_append(patterns_found, concat('Inciso ', roman_num));
        END LOOP;
      END;
    END LOOP;
    
    new_length := LENGTH(cleaned_content);
    
    -- Atualizar apenas se houve mudanças
    IF original_length != new_length THEN
      UPDATE legal_articles 
      SET 
        full_content = cleaned_content,
        updated_at = NOW()
      WHERE legal_articles.id = rec.id;
      
      -- Retornar informações
      RETURN QUERY SELECT 
        rec.id,
        original_length,
        new_length,
        duplications_count,
        patterns_found;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;