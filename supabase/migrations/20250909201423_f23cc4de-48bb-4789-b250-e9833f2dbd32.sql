-- Enhanced chat session deletion with atomic transaction and comprehensive cleanup
-- This function ensures all related data is deleted in a single atomic transaction

CREATE OR REPLACE FUNCTION delete_chat_session_atomic(session_id_param UUID)
RETURNS jsonb AS $$
DECLARE
  session_exists BOOLEAN;
  user_owns_session BOOLEAN;
  deleted_records JSONB;
  token_count INTEGER := 0;
  history_count INTEGER := 0;
  message_count INTEGER := 0;
BEGIN
  -- Check if session exists and user owns it
  SELECT EXISTS(
    SELECT 1 FROM chat_sessions 
    WHERE id = session_id_param
  ) INTO session_exists;
  
  IF NOT session_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session not found',
      'session_id', session_id_param
    );
  END IF;
  
  -- Check ownership
  SELECT EXISTS(
    SELECT 1 FROM chat_sessions 
    WHERE id = session_id_param 
    AND (user_id = auth.uid() OR is_supervisor_or_admin())
  ) INTO user_owns_session;
  
  IF NOT user_owns_session THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied - user does not own this session',
      'session_id', session_id_param
    );
  END IF;
  
  -- Start atomic deletion process
  BEGIN
    -- 1. Delete QA token usage (if exists)
    DELETE FROM qa_token_usage 
    WHERE validation_run_id = session_id_param;
    GET DIAGNOSTICS token_count = ROW_COUNT;
    
    -- 2. Delete messages (if exists)
    DELETE FROM messages 
    WHERE session_id = session_id_param;
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- 3. Delete chat history
    DELETE FROM chat_history 
    WHERE session_id = session_id_param;
    GET DIAGNOSTICS history_count = ROW_COUNT;
    
    -- 4. Delete chat memory (if exists)
    DELETE FROM chat_memory 
    WHERE session_id::uuid = session_id_param;
    
    -- 5. Finally delete the session
    DELETE FROM chat_sessions 
    WHERE id = session_id_param;
    
    -- Prepare success response with details
    deleted_records := jsonb_build_object(
      'success', true,
      'session_id', session_id_param,
      'deleted_counts', jsonb_build_object(
        'chat_history', history_count,
        'messages', message_count,
        'qa_token_usage', token_count
      ),
      'message', 'Session deleted successfully'
    );
    
    RETURN deleted_records;
    
  EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, the transaction will be rolled back automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'session_id', session_id_param,
      'message', 'Failed to delete session due to database error'
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_chat_session_atomic(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_chat_session_atomic(UUID) IS 'Atomically deletes a chat session and all its related data in a single transaction. Includes proper ownership validation and comprehensive error handling.';