-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- URL: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
-- =====================================================

-- Criar tabela llm_metrics para tracking de uso dos modelos LLM
CREATE TABLE IF NOT EXISTS public.llm_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    session_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    provider TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    cost DECIMAL(10, 6) DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_llm_metrics_provider ON public.llm_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_success ON public.llm_metrics(success);

-- Habilitar Row Level Security
ALTER TABLE public.llm_metrics ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.llm_metrics;
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.llm_metrics;
DROP POLICY IF EXISTS "Service role full access" ON public.llm_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.llm_metrics;

-- Criar políticas RLS
CREATE POLICY "Users can view their own metrics" ON public.llm_metrics
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics" ON public.llm_metrics
    FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Service role full access" ON public.llm_metrics
    FOR ALL 
    USING (true);

CREATE POLICY "Authenticated users can insert" ON public.llm_metrics
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NOT NULL
    );

-- Conceder permissões apropriadas
GRANT ALL ON public.llm_metrics TO service_role;
GRANT SELECT, INSERT ON public.llm_metrics TO authenticated;
GRANT SELECT ON public.llm_metrics TO anon;

-- Adicionar comentários úteis
COMMENT ON TABLE public.llm_metrics IS 'Armazena métricas e dados de uso para chamadas de modelos LLM';
COMMENT ON COLUMN public.llm_metrics.model_name IS 'O modelo específico usado (ex: gpt-4, claude-3)';
COMMENT ON COLUMN public.llm_metrics.provider IS 'O provedor LLM (ex: openai, anthropic)';
COMMENT ON COLUMN public.llm_metrics.prompt_tokens IS 'Número de tokens no prompt';
COMMENT ON COLUMN public.llm_metrics.completion_tokens IS 'Número de tokens na resposta';
COMMENT ON COLUMN public.llm_metrics.total_tokens IS 'Total de tokens usados (prompt + resposta)';
COMMENT ON COLUMN public.llm_metrics.execution_time_ms IS 'Tempo de execução da requisição em milissegundos';
COMMENT ON COLUMN public.llm_metrics.cost IS 'Custo estimado da requisição em USD';
COMMENT ON COLUMN public.llm_metrics.request_type IS 'Tipo de requisição (ex: chat, completion, embedding)';
COMMENT ON COLUMN public.llm_metrics.success IS 'Se a requisição foi bem-sucedida';
COMMENT ON COLUMN public.llm_metrics.error_message IS 'Mensagem de erro se a requisição falhou';
COMMENT ON COLUMN public.llm_metrics.metadata IS 'Metadados adicionais sobre a requisição';

-- Verificar se a tabela foi criada com sucesso
SELECT 
    'Tabela llm_metrics criada com sucesso!' as status,
    COUNT(*) as total_registros
FROM public.llm_metrics;