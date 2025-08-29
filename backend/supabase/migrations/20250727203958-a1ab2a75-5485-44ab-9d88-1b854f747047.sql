-- Add model column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN model TEXT DEFAULT 'openai';

-- Create agent_executions table for tracking AI agent runs
CREATE TABLE public.agent_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  execution_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on agent_executions
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_executions
CREATE POLICY "Users can manage their own agent executions" 
ON public.agent_executions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all agent executions" 
ON public.agent_executions 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create execute_sql_query function
CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  error_msg TEXT;
BEGIN
  -- Only allow SELECT queries for security
  IF NOT (TRIM(UPPER(query_text)) LIKE 'SELECT%') THEN
    RETURN jsonb_build_object('error', 'Only SELECT queries are allowed');
  END IF;
  
  -- Execute the query and return results as JSON
  BEGIN
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RETURN jsonb_build_object('error', error_msg);
  END;
END;
$$;

-- Create trigger for updating updated_at on agent_executions
CREATE TRIGGER update_agent_executions_updated_at
BEFORE UPDATE ON public.agent_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();