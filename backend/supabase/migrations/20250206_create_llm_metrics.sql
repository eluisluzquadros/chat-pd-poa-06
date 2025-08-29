-- Migration: Create llm_metrics table for tracking LLM usage
-- Date: 2025-02-06

-- Drop existing table if needed (be careful in production!)
-- DROP TABLE IF EXISTS public.llm_metrics CASCADE;

-- Create the llm_metrics table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_llm_metrics_session_id ON public.llm_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_user_id ON public.llm_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON public.llm_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_model_name ON public.llm_metrics(model_name);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_provider ON public.llm_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_success ON public.llm_metrics(success);

-- Enable Row Level Security
ALTER TABLE public.llm_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.llm_metrics;
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.llm_metrics;
DROP POLICY IF EXISTS "Service role full access" ON public.llm_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.llm_metrics;

-- Create RLS policies
-- Users can view their own metrics
CREATE POLICY "Users can view their own metrics" ON public.llm_metrics
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Admins can view all metrics
CREATE POLICY "Admins can view all metrics" ON public.llm_metrics
    FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access" ON public.llm_metrics
    FOR ALL 
    USING (
        auth.role() = 'service_role'
    );

-- Authenticated users can insert their own metrics
CREATE POLICY "Authenticated users can insert" ON public.llm_metrics
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NOT NULL
    );

-- Grant appropriate permissions
GRANT ALL ON public.llm_metrics TO service_role;
GRANT SELECT, INSERT ON public.llm_metrics TO authenticated;
GRANT SELECT ON public.llm_metrics TO anon;

-- Add helpful comments
COMMENT ON TABLE public.llm_metrics IS 'Stores metrics and usage data for LLM model calls';
COMMENT ON COLUMN public.llm_metrics.model_name IS 'The specific model used (e.g., gpt-4, claude-3)';
COMMENT ON COLUMN public.llm_metrics.provider IS 'The LLM provider (e.g., openai, anthropic)';
COMMENT ON COLUMN public.llm_metrics.prompt_tokens IS 'Number of tokens in the prompt';
COMMENT ON COLUMN public.llm_metrics.completion_tokens IS 'Number of tokens in the completion';
COMMENT ON COLUMN public.llm_metrics.total_tokens IS 'Total tokens used (prompt + completion)';
COMMENT ON COLUMN public.llm_metrics.execution_time_ms IS 'Time taken to execute the request in milliseconds';
COMMENT ON COLUMN public.llm_metrics.cost IS 'Estimated cost of the request in USD';
COMMENT ON COLUMN public.llm_metrics.request_type IS 'Type of request (e.g., chat, completion, embedding)';
COMMENT ON COLUMN public.llm_metrics.success IS 'Whether the request was successful';
COMMENT ON COLUMN public.llm_metrics.error_message IS 'Error message if the request failed';
COMMENT ON COLUMN public.llm_metrics.metadata IS 'Additional metadata about the request';