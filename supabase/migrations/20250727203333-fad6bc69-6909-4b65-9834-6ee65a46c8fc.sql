-- Add last_message field to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN last_message TEXT;