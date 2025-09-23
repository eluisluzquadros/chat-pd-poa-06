-- Criar tabela platform_settings se não existir
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: apenas admins podem ver/editar configurações
CREATE POLICY "Admins can view platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can insert platform settings" 
ON public.platform_settings 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update platform settings" 
ON public.platform_settings 
FOR UPDATE 
USING (is_admin());

-- Inserir configuração padrão para RAG
INSERT INTO public.platform_settings (key, value, description, category)
VALUES ('rag_mode', '"local"', 'Modo de operação do sistema RAG: local ou dify', 'system')
ON CONFLICT (key) DO NOTHING;