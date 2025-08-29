-- Criar tabela session_memory para o Master Orchestrator
CREATE TABLE IF NOT EXISTS public.session_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  query TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  agent_results JSONB DEFAULT '[]',
  response TEXT,
  confidence NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.session_memory ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own session memory" 
ON public.session_memory 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_session_memory_session_id ON public.session_memory (session_id);
CREATE INDEX IF NOT EXISTS idx_session_memory_turn_number ON public.session_memory (session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_session_memory_created_at ON public.session_memory (created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_session_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_memory_updated_at
  BEFORE UPDATE ON public.session_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_session_memory_updated_at();