-- Criar tabela llm_metrics se não existir
CREATE TABLE IF NOT EXISTS public.llm_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    provider TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    execution_time_ms INTEGER,
    cost DECIMAL(10, 6),
    request_type TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_llm_metrics_session_id ON public.llm_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_user_id ON public.llm_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON public.llm_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_model_name ON public.llm_metrics(model_name);

-- Habilitar RLS
ALTER TABLE public.llm_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own metrics" ON public.llm_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert metrics" ON public.llm_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update metrics" ON public.llm_metrics
    FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON public.llm_metrics TO service_role;
GRANT SELECT ON public.llm_metrics TO authenticated;

-- Adicionar comentário na tabela
COMMENT ON TABLE public.llm_metrics IS 'Armazena métricas de uso dos modelos LLM';