-- ============================================
-- CORREÇÃO DE FUNÇÕES SECURITY DEFINER
-- Converter funções desnecessárias para SECURITY INVOKER
-- ============================================

-- 1. MANTER SECURITY DEFINER apenas para funções que realmente precisam
-- (funções de verificação de role precisam para contornar RLS)

-- Função get_current_user_role - MANTER SECURITY DEFINER (necessário para RLS)
-- Já está correta - não alterar

-- Função is_admin - MANTER SECURITY DEFINER (necessário para RLS)
-- Já está correta - não alterar

-- Função is_supervisor_or_admin - MANTER SECURITY DEFINER (necessário para RLS)  
-- Já está correta - não alterar

-- 2. CONVERTER PARA SECURITY INVOKER (funções que não precisam de privilégios elevados)

-- execute_sql_query - CONVERTER para SECURITY INVOKER (mais seguro)
CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudança: de DEFINER para INVOKER
SET search_path TO 'public'
AS $function$
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
$function$;

-- check_auth_rate_limit - CONVERTER para SECURITY INVOKER (mais seguro)
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(user_ip inet, max_attempts integer, window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudança: de DEFINER para INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts from this IP
  SELECT COUNT(*) INTO attempt_count
  FROM auth_attempts
  WHERE ip_address = user_ip
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Return true if within limit, false if exceeded
  RETURN attempt_count < max_attempts;
END;
$function$;

-- log_user_action - CONVERTER para SECURITY INVOKER (mais seguro)
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name text,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudança: de DEFINER para INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    action_name,
    table_name,
    record_id,
    old_values,
    new_values,
    NOW()
  );
END;
$function$;

-- 3. REMOVER FUNÇÕES DESNECESSÁRIAS OU PROBLEMÁTICAS

-- execute_dynamic_sql - REMOVER (muito perigosa)
DROP FUNCTION IF EXISTS public.execute_dynamic_sql(text);

-- handle_new_user - VERIFICAR se pode ser SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudança: de DEFINER para INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;

-- track_test_case_changes - CONVERTER para SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.track_test_case_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER  -- Mudança: de DEFINER para INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO qa_test_case_history (
      test_case_id,
      version,
      question,
      expected_answer,
      category,
      difficulty,
      is_sql_related,
      expected_sql,
      sql_complexity,
      tags,
      changed_by,
      change_reason
    ) VALUES (
      OLD.id,
      OLD.version + 1,
      OLD.question,
      OLD.expected_answer,
      OLD.category,
      OLD.difficulty,
      OLD.is_sql_related,
      OLD.expected_sql,
      OLD.sql_complexity,
      OLD.tags,
      auth.uid(),
      'Automated version tracking'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. VERIFICAR RESULTADO DAS CORREÇÕES
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER ⚠️'
        ELSE 'SECURITY INVOKER ✅'
    END as security_mode,
    'Fixed security configuration' as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'execute_sql_query',
    'check_auth_rate_limit', 
    'log_user_action',
    'handle_new_user',
    'track_test_case_changes',
    'get_current_user_role',
    'is_admin',
    'is_supervisor_or_admin'
  )
ORDER BY 
  CASE WHEN p.prosecdef THEN 1 ELSE 2 END,
  p.proname;