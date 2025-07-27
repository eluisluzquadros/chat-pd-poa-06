
CREATE OR REPLACE FUNCTION delete_chat_session(session_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Delete chat history first
    DELETE FROM chat_history
    WHERE session_id = session_id_param;
    
    -- Then delete the session
    DELETE FROM chat_sessions
    WHERE id = session_id_param;
END;
$$ LANGUAGE plpgsql;
