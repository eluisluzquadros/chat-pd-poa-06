-- Security Fix: Add SET search_path = public to critical database functions
-- This prevents SQL injection attacks through schema manipulation

-- Fix has_role function (used in RLS policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
  );
$$;

-- Fix is_supervisor_or_admin function
CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin'::app_role, 'supervisor'::app_role)
  );
$$;

-- Fix user_owns_session function
CREATE OR REPLACE FUNCTION public.user_owns_session(session_id_param text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM chat_sessions 
    WHERE id::text = session_id_param 
      AND user_id = auth.uid()
  );
$$;

-- Fix check_auth_rate_limit function
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(user_ip inet, max_attempts integer, window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM auth_attempts
  WHERE ip_address = user_ip
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- Fix log_user_action function
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name text, 
  table_name text, 
  record_id text, 
  old_values jsonb, 
  new_values jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    user_id, action, table_name, record_id, 
    old_values, new_values, created_at
  ) VALUES (
    auth.uid(), action_name, table_name, record_id,
    old_values, new_values, NOW()
  );
END;
$$;

-- Fix execute_sql_query function (also restrict to admin only)
CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  error_msg TEXT;
BEGIN
  -- Security: Only admins can execute queries
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Security: Only SELECT queries allowed
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
$$;

-- Fix delete_chat_session_atomic function
CREATE OR REPLACE FUNCTION public.delete_chat_session_atomic(session_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_exists BOOLEAN;
  user_owns_session BOOLEAN;
  history_count INTEGER := 0;
  token_count INTEGER := 0;
BEGIN
  SELECT EXISTS(SELECT 1 FROM chat_sessions WHERE id = session_id_param) INTO session_exists;
  
  IF NOT session_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found', 'session_id', session_id_param);
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM chat_sessions WHERE id = session_id_param AND user_id = auth.uid()) INTO user_owns_session;
  
  IF NOT user_owns_session THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied', 'session_id', session_id_param);
  END IF;
  
  DELETE FROM token_usage WHERE session_id = session_id_param;
  GET DIAGNOSTICS token_count = ROW_COUNT;
  
  DELETE FROM chat_history WHERE session_id = session_id_param;
  GET DIAGNOSTICS history_count = ROW_COUNT;
  
  DELETE FROM chat_sessions WHERE id = session_id_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', session_id_param, 
    'deleted_counts', jsonb_build_object('chat_history', history_count, 'token_usage', token_count), 
    'message', 'Session deleted successfully'
  );
END;
$$;

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;