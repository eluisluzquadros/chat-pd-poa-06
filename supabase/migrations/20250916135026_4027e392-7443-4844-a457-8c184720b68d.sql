-- Create table for Dify agent configurations
CREATE TABLE public.dify_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- e.g., 'agentic-v1', 'agentic-claude_35_sonnet'
  display_name TEXT NOT NULL, -- e.g., 'Agentic V1', 'Claude 3.5 Sonnet'
  description TEXT,
  provider TEXT NOT NULL, -- e.g., 'anthropic', 'openai'
  model TEXT NOT NULL, -- e.g., 'claude-3-5-sonnet-20241022', 'gpt-5-nano'
  dify_config JSONB NOT NULL DEFAULT '{}', -- Dify-specific configuration
  parameters JSONB NOT NULL DEFAULT '{}', -- Model parameters (temperature, max_tokens, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.dify_agents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage dify agents"
ON public.dify_agents
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view active dify agents"
ON public.dify_agents
FOR SELECT
USING (is_active = true);

-- Create indexes
CREATE INDEX idx_dify_agents_name ON public.dify_agents(name);
CREATE INDEX idx_dify_agents_active ON public.dify_agents(is_active);
CREATE INDEX idx_dify_agents_default ON public.dify_agents(is_default);

-- Create function to update timestamps
CREATE TRIGGER update_dify_agents_updated_at
BEFORE UPDATE ON public.dify_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default agents
INSERT INTO public.dify_agents (name, display_name, description, provider, model, is_default) VALUES
('agentic-v1', 'Agentic V1', 'Sistema agentic original baseado em Supabase', 'legacy', 'supabase-rag', true),
('agentic-claude_35_sonnet', 'Claude 3.5 Sonnet', 'Agente baseado no modelo Claude 3.5 Sonnet da Anthropic', 'anthropic', 'claude-3-5-sonnet-20241022', false),
('agentic-gpt_5_nano', 'GPT-5 Nano', 'Agente baseado no modelo GPT-5 Nano da OpenAI', 'openai', 'gpt-5-nano-2025-08-07', false);