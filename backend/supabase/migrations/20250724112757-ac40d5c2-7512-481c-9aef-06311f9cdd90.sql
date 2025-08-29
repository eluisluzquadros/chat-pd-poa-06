-- Add openai_thread_id column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN openai_thread_id TEXT;