-- Create external knowledge bases table
CREATE TABLE IF NOT EXISTS public.external_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('llamacloud', 'pinecone', 'weaviate', 'custom')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  retrieval_settings JSONB NOT NULL DEFAULT '{"top_k": 5, "score_threshold": 0.7}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create agent-knowledge base relationship table
CREATE TABLE IF NOT EXISTS public.agent_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.dify_agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES public.external_knowledge_bases(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, knowledge_base_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bases_agent_id ON public.agent_knowledge_bases(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bases_kb_id ON public.agent_knowledge_bases(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_external_kb_provider ON public.external_knowledge_bases(provider);
CREATE INDEX IF NOT EXISTS idx_external_kb_active ON public.external_knowledge_bases(is_active);

-- Enable RLS
ALTER TABLE public.external_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_knowledge_bases
CREATE POLICY "Admins can manage external knowledge bases"
ON public.external_knowledge_bases
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Authenticated users can view active knowledge bases"
ON public.external_knowledge_bases
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for agent_knowledge_bases
CREATE POLICY "Admins can manage agent knowledge base links"
ON public.agent_knowledge_bases
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Authenticated users can view active agent KB links"
ON public.agent_knowledge_bases
FOR SELECT
TO authenticated
USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for external_knowledge_bases
CREATE TRIGGER update_external_kb_updated_at
BEFORE UPDATE ON public.external_knowledge_bases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();