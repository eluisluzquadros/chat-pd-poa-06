-- Create platform settings table for system-wide configurations
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage platform settings" 
ON public.platform_settings 
FOR ALL 
USING (is_admin());

CREATE POLICY "All authenticated users can read active platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Create indexes for performance
CREATE INDEX idx_platform_settings_key ON public.platform_settings(key);
CREATE INDEX idx_platform_settings_category ON public.platform_settings(category);
CREATE INDEX idx_platform_settings_active ON public.platform_settings(is_active);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_platform_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_timestamp();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
('default_llm_model', '"anthropic/claude-3-5-sonnet-20241022"', 'Modelo LLM padrão para usuários não-admin', 'llm'),
('allow_user_model_selection', 'false', 'Permite que usuários não-admin selecionem modelos LLM', 'llm'),
('max_conversation_history', '10', 'Máximo de mensagens no histórico de conversa', 'chat'),
('enable_chat_cache', 'true', 'Habilita cache de respostas do chat', 'performance');