-- Adicionar colunas ausentes na tabela session_memory existente
ALTER TABLE public.session_memory 
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS agent_results JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Renomear timestamp para created_at se necessário
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_memory' AND column_name = 'timestamp') THEN
    -- Se já tem created_at, remover timestamp
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_memory' AND column_name = 'created_at') THEN
      ALTER TABLE public.session_memory DROP COLUMN timestamp;
    ELSE
      -- Se não tem created_at, renomear timestamp
      ALTER TABLE public.session_memory RENAME COLUMN timestamp TO created_at;
    END IF;
  END IF;
END $$;

-- Habilitar RLS se não estiver
ALTER TABLE public.session_memory ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can manage their own session memory" ON public.session_memory;

-- Criar política
CREATE POLICY "Users can manage their own session memory" 
ON public.session_memory 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_session_memory_session_id ON public.session_memory (session_id);
CREATE INDEX IF NOT EXISTS idx_session_memory_turn_number ON public.session_memory (session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_session_memory_created_at ON public.session_memory (created_at DESC);