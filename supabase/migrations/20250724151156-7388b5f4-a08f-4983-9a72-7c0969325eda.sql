-- Fix remaining security warnings from linter

-- 1. Add RLS policies for documents table (INFO issue)
-- The documents table now has RLS enabled but needs proper policies

-- 2. Fix all remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.user_has_platform_access(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_accounts 
    WHERE email = user_email AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_oauth_access(user_email text, user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_data record;
  result json;
BEGIN
  -- Verificar se o usuário existe na tabela user_accounts
  SELECT * INTO account_data FROM public.user_accounts 
  WHERE email = user_email;
  
  IF account_data IS NULL THEN
    result := json_build_object(
      'has_access', false,
      'reason', 'user_not_found',
      'message', 'Conta não encontrada. Solicite acesso através do formulário de interesse.'
    );
  ELSIF NOT account_data.active THEN
    result := json_build_object(
      'has_access', false,
      'reason', 'account_inactive',
      'message', 'Conta inativa. Entre em contato com o administrador.'
    );
  ELSE
    result := json_build_object(
      'has_access', true,
      'user_data', row_to_json(account_data)
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_interest_to_user(interest_id uuid, password text, role_name app_role DEFAULT 'citizen'::app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  interest_record record;
BEGIN
  -- Get the interest record
  SELECT * INTO interest_record FROM public.interest_manifestations 
  WHERE id = interest_id AND account_created = false;
  
  IF interest_record IS NULL THEN
    RAISE EXCEPTION 'Interest record not found or already converted';
  END IF;
  
  -- Create user account entry
  INSERT INTO public.user_accounts (
    email, 
    full_name,
    organization,
    role,
    active
  ) VALUES (
    interest_record.email,
    interest_record.full_name,
    interest_record.organization,
    role_name::text,
    true
  )
  RETURNING id INTO new_user_id;
  
  -- Mark interest as converted
  UPDATE public.interest_manifestations
  SET account_created = true,
      status = 'approved'
  WHERE id = interest_id;
  
  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_sessions_search_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.searchable_text := to_tsvector('portuguese', 
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.last_message, '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_chat_session(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete chat history first
    DELETE FROM chat_history
    WHERE session_id = session_id_param;
    
    -- Then delete the session
    DELETE FROM chat_sessions
    WHERE id = session_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$;

-- Fix the match_documents overload function
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer, document_ids uuid[])
RETURNS TABLE(content_chunk text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) as similarity
  FROM
    document_embeddings de
  WHERE
    de.document_id = ANY(document_ids)
  ORDER BY
    de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;