-- ============================================
-- CORREÇÃO DE SECURITY DEFINER - VERSÃO CUIDADOSA
-- Preservar triggers e dependências
-- ============================================

-- 1. FUNÇÕES QUE PODEM SER CONVERTIDAS SEGURAMENTE

-- execute_sql_query - converter para SECURITY INVOKER
DROP FUNCTION IF EXISTS public.execute_sql_query(text);
CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  error_msg TEXT;
BEGIN
  IF NOT (TRIM(UPPER(query_text)) LIKE 'SELECT%') THEN
    RETURN jsonb_build_object('error', 'Only SELECT queries allowed');
  END IF;
  
  BEGIN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RETURN jsonb_build_object('error', error_msg);
  END;
END;
$function$;

-- check_auth_rate_limit - converter para SECURITY INVOKER
DROP FUNCTION IF EXISTS public.check_auth_rate_limit(inet, integer, integer);
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  user_ip inet, 
  max_attempts integer, 
  window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM auth_attempts
  WHERE ip_address = user_ip
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  RETURN attempt_count < max_attempts;
END;
$function$;

-- log_user_action - converter para SECURITY INVOKER
DROP FUNCTION IF EXISTS public.log_user_action(text, text, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name text,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_log (
    user_id, action, table_name, record_id, 
    old_values, new_values, created_at
  ) VALUES (
    auth.uid(), action_name, table_name, record_id,
    old_values, new_values, NOW()
  );
END;
$function$;

-- 2. REMOVER FUNÇÃO PERIGOSA
DROP FUNCTION IF EXISTS public.execute_dynamic_sql(text);

-- 3. APENAS REMOVER TRIGGERS ANTES DE ALTERAR handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar handle_new_user como SECURITY INVOKER
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. track_test_case_changes - verificar se tem triggers dependentes
DROP FUNCTION IF EXISTS public.track_test_case_changes() CASCADE;
CREATE OR REPLACE FUNCTION public.track_test_case_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO qa_test_case_history (
      test_case_id, version, question, expected_answer,
      category, difficulty, changed_by, change_reason
    ) VALUES (
      OLD.id, OLD.version + 1, OLD.question, OLD.expected_answer,
      OLD.category, OLD.difficulty, auth.uid(), 'Auto tracking'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 5. VERIFICAR RESULTADO FINAL
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER ⚠️'
        ELSE 'SECURITY INVOKER ✅'
    END as security_mode,
    'Conversão para SECURITY INVOKER concluída' as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'execute_sql_query', 'check_auth_rate_limit', 'log_user_action',
    'handle_new_user', 'track_test_case_changes'
  )
ORDER BY p.proname;