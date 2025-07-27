-- Create token usage tracking table
CREATE TABLE public.token_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.chat_sessions(id),
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(10,6) NOT NULL DEFAULT 0.0,
  message_content_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own token usage" 
ON public.token_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own token usage" 
ON public.token_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all token usage" 
ON public.token_usage 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create index for better performance
CREATE INDEX idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX idx_token_usage_session_id ON public.token_usage(session_id);
CREATE INDEX idx_token_usage_created_at ON public.token_usage(created_at);

-- Create view for token usage summary
CREATE OR REPLACE VIEW public.token_usage_summary AS
SELECT 
  user_id,
  model,
  DATE(created_at) as usage_date,
  COUNT(*) as message_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost
FROM public.token_usage
GROUP BY user_id, model, DATE(created_at);