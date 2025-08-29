-- Fix chat_sessions and chat_history permissions
-- This migration ensures proper RLS policies for chat tables

-- Enable RLS on chat tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can create own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON chat_history;

-- Create policies for chat_sessions
CREATE POLICY "Users can view own chat sessions" 
ON chat_sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" 
ON chat_sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" 
ON chat_sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" 
ON chat_sessions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create policies for chat_history
CREATE POLICY "Users can view own chat history" 
ON chat_history FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_history.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own chat history" 
ON chat_history FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_history.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own chat history" 
ON chat_history FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_history.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_history.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own chat history" 
ON chat_history FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_history.session_id 
    AND chat_sessions.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_history TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);