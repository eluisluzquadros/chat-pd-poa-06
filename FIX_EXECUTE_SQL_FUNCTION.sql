-- Verificar se a função execute_sql_query existe
SELECT 
    proname,
    pronargs,
    prorettype::regtype,
    prosrc
FROM pg_proc 
WHERE proname = 'execute_sql_query';

-- Recriar a função com melhor tratamento de erro
DROP FUNCTION IF EXISTS public.execute_sql_query(TEXT);

CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  error_msg TEXT;
  error_detail TEXT;
  error_hint TEXT;
BEGIN
  -- Log the query being executed
  RAISE NOTICE 'Executing query: %', query_text;
  
  -- Only allow SELECT queries for security
  IF NOT (TRIM(UPPER(query_text)) LIKE 'SELECT%') THEN
    RETURN jsonb_build_object(
      'error', 'Only SELECT queries are allowed',
      'query', query_text
    );
  END IF;
  
  -- Execute the query and return results as JSON
  BEGIN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;
    
    -- If result is NULL, return empty array
    IF result IS NULL THEN
      result = '[]'::jsonb;
    END IF;
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      error_msg = MESSAGE_TEXT,
      error_detail = PG_EXCEPTION_DETAIL,
      error_hint = PG_EXCEPTION_HINT;
    
    -- Log the error
    RAISE NOTICE 'SQL execution error: %, Detail: %, Hint: %', error_msg, error_detail, error_hint;
    
    -- Return error as JSON
    RETURN jsonb_build_object(
      'error', error_msg,
      'detail', error_detail,
      'hint', error_hint,
      'query', query_text
    );
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_sql_query(TEXT) TO anon, authenticated, service_role;

-- Test the function
SELECT execute_sql_query('SELECT 1 as test');

-- Test with document_rows
SELECT execute_sql_query('SELECT COUNT(*) as total FROM document_rows');