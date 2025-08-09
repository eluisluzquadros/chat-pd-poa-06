-- Clean up promotional templates from qa_test_cases expected_answer column
-- and improve expected_keywords

-- First, let's create a backup of the current state
CREATE TABLE IF NOT EXISTS qa_test_cases_backup_clean AS 
SELECT * FROM qa_test_cases;

-- Function to clean promotional templates from text
CREATE OR REPLACE FUNCTION clean_promotional_template(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  IF text_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(text_input,
                      '📍.*?Explore mais:.*?$', '', 'gm'),
                    '💬.*?Dúvidas\?.*?$', '', 'gm'),
                  'https://bit\.ly/\w+\s*↗\s*↗', '', 'g'),
                'Contribua com sugestões:.*?$', '', 'gm'),
              'Participe da Audiência Pública:.*?$', '', 'gm'),
            'Mapa com Regras Construtivas:.*?$', '', 'gm'),
          'planodiretor@portoalegre\.rs\.gov\.br', '', 'g'),
        '\n{3,}', E'\n\n', 'g'),
      '\s{2,}', ' ', 'g'),
    '^\s+|\s+$', '', 'g'
  );
END;
$$ LANGUAGE plpgsql;

-- Update expected_answer to remove promotional templates
UPDATE qa_test_cases 
SET expected_answer = clean_promotional_template(expected_answer)
WHERE expected_answer IS NOT NULL 
  AND (expected_answer LIKE '%📍%' 
       OR expected_answer LIKE '%💬%' 
       OR expected_answer LIKE '%bit.ly%'
       OR expected_answer LIKE '%planodiretor@%');

-- Function to extract meaningful keywords from cleaned text
CREATE OR REPLACE FUNCTION extract_keywords(text_input TEXT, category_input TEXT)
RETURNS TEXT[] AS $$
DECLARE
  words TEXT[];
  result TEXT[] := '{}';
  word TEXT;
BEGIN
  IF text_input IS NULL THEN
    RETURN result;
  END IF;
  
  -- Clean and normalize text
  text_input := lower(regexp_replace(text_input, '[^\w\s]', ' ', 'g'));
  text_input := regexp_replace(text_input, '\s+', ' ', 'g');
  
  -- Split into words
  words := string_to_array(text_input, ' ');
  
  -- Extract meaningful keywords based on category
  FOREACH word IN ARRAY words
  LOOP
    -- Skip short words and common stopwords
    IF length(word) > 3 AND word NOT IN ('para', 'pelo', 'pela', 'pela', 'este', 'esta', 'este', 'essa', 'isso', 'pode', 'deve', 'sera', 'mais', 'muito', 'todas', 'todos', 'onde', 'quando', 'como', 'porque') THEN
      -- Category-specific important terms
      IF category_input = 'zoneamento' AND (word LIKE '%zot%' OR word LIKE '%zona%' OR word LIKE '%coeficiente%' OR word LIKE '%altura%' OR word ~ '\d+') THEN
        result := array_append(result, word);
      ELSIF category_input = 'altura_maxima' AND (word LIKE '%metro%' OR word LIKE '%altura%' OR word ~ '\d+' OR word LIKE '%maxim%') THEN
        result := array_append(result, word);
      ELSIF category_input = 'uso-solo' AND (word LIKE '%art%' OR word LIKE '%certificacao%' OR word LIKE '%sustentabilidade%' OR word LIKE '%incentivo%') THEN
        result := array_append(result, word);
      ELSIF length(word) > 5 AND word NOT LIKE '%http%' THEN
        result := array_append(result, word);
      END IF;
    END IF;
  END LOOP;
  
  -- Ensure at least some keywords
  IF array_length(result, 1) IS NULL OR array_length(result, 1) < 3 THEN
    -- Fallback: include any word longer than 4 characters
    FOREACH word IN ARRAY words
    LOOP
      IF length(word) > 4 AND word NOT LIKE '%http%' AND word NOT IN ('para', 'pelo', 'pela', 'este', 'esta', 'essa', 'isso', 'pode', 'deve', 'sera', 'mais', 'muito', 'todas', 'todos', 'onde', 'quando', 'como', 'porque') THEN
        result := array_append(result, word);
        IF array_length(result, 1) >= 5 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN result[1:LEAST(array_length(result, 1), 10)]; -- Limit to 10 keywords
END;
$$ LANGUAGE plpgsql;

-- Update expected_keywords for cases that have empty or very generic keywords
UPDATE qa_test_cases 
SET expected_keywords = extract_keywords(expected_answer, category)
WHERE (expected_keywords IS NULL 
       OR array_length(expected_keywords, 1) IS NULL 
       OR array_length(expected_keywords, 1) < 2
       OR expected_keywords = ARRAY['resposta', 'esperada']
       OR expected_keywords = ARRAY['não', 'especificada'])
  AND expected_answer IS NOT NULL
  AND length(trim(expected_answer)) > 20;

-- Clean up the helper functions
DROP FUNCTION IF EXISTS clean_promotional_template(TEXT);
DROP FUNCTION IF EXISTS extract_keywords(TEXT, TEXT);

-- Add index for better performance on validation queries
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_category_difficulty 
ON qa_test_cases(category, difficulty) 
WHERE is_active = true;

-- Update statistics
ANALYZE qa_test_cases;