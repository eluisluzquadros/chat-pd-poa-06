-- Create LLM metrics table for tracking model performance
CREATE TABLE IF NOT EXISTS llm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  tokens_per_second NUMERIC(10,2),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_per_token NUMERIC(12,8),
  total_cost NUMERIC(10,6),
  quality_score NUMERIC(5,2),
  confidence NUMERIC(3,2),
  success_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  user_role TEXT,
  query_length INTEGER,
  query_complexity TEXT CHECK (query_complexity IN ('simple', 'medium', 'complex')),
  has_image BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_metrics_provider ON llm_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_model ON llm_metrics(model);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON llm_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_provider_model ON llm_metrics(provider, model);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_quality_score ON llm_metrics(quality_score);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_response_time ON llm_metrics(response_time);

-- Create model performance summary view
CREATE OR REPLACE VIEW llm_model_performance AS
SELECT 
  provider,
  model,
  COUNT(*) as total_requests,
  AVG(response_time) as avg_response_time,
  AVG(quality_score) as avg_quality_score,
  AVG(total_cost) as avg_cost,
  AVG(tokens_per_second) as avg_tokens_per_second,
  AVG(confidence) as avg_confidence,
  (COUNT(*) FILTER (WHERE success_rate > 50)) * 100.0 / COUNT(*) as success_rate,
  MIN(created_at) as first_used,
  MAX(created_at) as last_used,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600 as hours_of_use
FROM llm_metrics 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider, model
ORDER BY avg_quality_score DESC, avg_response_time ASC;

-- Create daily metrics aggregation view
CREATE OR REPLACE VIEW llm_daily_metrics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  provider,
  model,
  COUNT(*) as requests,
  AVG(response_time) as avg_response_time,
  AVG(quality_score) as avg_quality_score,
  SUM(total_cost) as total_cost,
  AVG(tokens_per_second) as avg_tokens_per_second,
  (COUNT(*) FILTER (WHERE success_rate > 50)) * 100.0 / COUNT(*) as success_rate
FROM llm_metrics 
GROUP BY DATE_TRUNC('day', created_at), provider, model
ORDER BY date DESC, avg_quality_score DESC;

-- Create model comparison function
CREATE OR REPLACE FUNCTION get_model_comparison(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  provider TEXT,
  model TEXT,
  performance_score NUMERIC,
  speed_rank INTEGER,
  quality_rank INTEGER,
  cost_rank INTEGER,
  overall_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH model_stats AS (
    SELECT 
      m.provider,
      m.model,
      AVG(m.response_time) as avg_response_time,
      AVG(m.quality_score) as avg_quality_score,
      AVG(m.total_cost) as avg_cost,
      COUNT(*) as request_count
    FROM llm_metrics m
    WHERE m.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY m.provider, m.model
    HAVING COUNT(*) >= 5 -- Minimum requests for statistical significance
  ),
  ranked_models AS (
    SELECT 
      ms.*,
      -- Calculate normalized performance score (0-100)
      (
        (100 - (RANK() OVER (ORDER BY avg_response_time ASC) - 1) * 100.0 / COUNT(*) OVER()) * 0.3 + -- Speed weight
        ((RANK() OVER (ORDER BY avg_quality_score DESC) - 1) * 100.0 / COUNT(*) OVER()) * 0.4 +      -- Quality weight  
        (100 - (RANK() OVER (ORDER BY avg_cost ASC) - 1) * 100.0 / COUNT(*) OVER()) * 0.3           -- Cost weight
      ) as performance_score,
      RANK() OVER (ORDER BY avg_response_time ASC) as speed_rank,
      RANK() OVER (ORDER BY avg_quality_score DESC) as quality_rank,
      RANK() OVER (ORDER BY avg_cost ASC) as cost_rank
    FROM model_stats ms
  )
  SELECT 
    rm.provider,
    rm.model,
    ROUND(rm.performance_score, 2) as performance_score,
    rm.speed_rank::INTEGER,
    rm.quality_rank::INTEGER,
    rm.cost_rank::INTEGER,
    RANK() OVER (ORDER BY rm.performance_score DESC)::INTEGER as overall_rank
  FROM ranked_models rm
  ORDER BY rm.performance_score DESC;
END;
$$;

-- Create function to get best model for specific criteria
CREATE OR REPLACE FUNCTION get_best_model(
  criteria TEXT DEFAULT 'quality', -- 'speed', 'quality', 'cost', 'balanced'
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  provider TEXT,
  model TEXT,
  score NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  CASE criteria
    WHEN 'speed' THEN
      RETURN QUERY
      SELECT 
        m.provider,
        m.model,
        (100.0 / AVG(m.response_time)) * 1000 as score,
        'Fastest average response time: ' || ROUND(AVG(m.response_time)) || 'ms' as reason
      FROM llm_metrics m
      WHERE m.created_at >= NOW() - (days_back || ' days')::INTERVAL
      GROUP BY m.provider, m.model
      HAVING COUNT(*) >= 3
      ORDER BY AVG(m.response_time) ASC
      LIMIT 1;
      
    WHEN 'quality' THEN
      RETURN QUERY
      SELECT 
        m.provider,
        m.model,
        AVG(m.quality_score) as score,
        'Highest quality score: ' || ROUND(AVG(m.quality_score), 1) || '/100' as reason
      FROM llm_metrics m
      WHERE m.created_at >= NOW() - (days_back || ' days')::INTERVAL
      GROUP BY m.provider, m.model
      HAVING COUNT(*) >= 3
      ORDER BY AVG(m.quality_score) DESC
      LIMIT 1;
      
    WHEN 'cost' THEN
      RETURN QUERY
      SELECT 
        m.provider,
        m.model,
        (1.0 / NULLIF(AVG(m.total_cost), 0)) * 0.001 as score,
        'Lowest cost: $' || ROUND(AVG(m.total_cost), 4) || ' per query' as reason
      FROM llm_metrics m
      WHERE m.created_at >= NOW() - (days_back || ' days')::INTERVAL
        AND m.total_cost > 0
      GROUP BY m.provider, m.model
      HAVING COUNT(*) >= 3
      ORDER BY AVG(m.total_cost) ASC
      LIMIT 1;
      
    ELSE -- 'balanced'
      RETURN QUERY
      SELECT 
        comp.provider,
        comp.model,
        comp.performance_score as score,
        'Best overall balance (rank #' || comp.overall_rank || ')' as reason
      FROM get_model_comparison(days_back) comp
      ORDER BY comp.performance_score DESC
      LIMIT 1;
  END CASE;
END;
$$;

-- Create function to record model usage
CREATE OR REPLACE FUNCTION record_model_usage(
  p_provider TEXT,
  p_model TEXT,
  p_response_time INTEGER,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_quality_score NUMERIC DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_session_id TEXT DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL,
  p_query_length INTEGER DEFAULT NULL,
  p_has_image BOOLEAN DEFAULT FALSE,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  metric_id UUID;
  model_config JSONB;
  cost_per_input NUMERIC;
  cost_per_output NUMERIC;
  total_cost NUMERIC;
  tokens_per_sec NUMERIC;
BEGIN
  -- Get model configuration (you might want to store this in a separate table)
  SELECT CASE p_provider
    WHEN 'openai' THEN '{"input": 0.0000025, "output": 0.00001}'::jsonb
    WHEN 'gpt-4.5' THEN '{"input": 0.000005, "output": 0.000015}'::jsonb
    WHEN 'claude' THEN '{"input": 0.000003, "output": 0.000015}'::jsonb
    WHEN 'claude-3-opus' THEN '{"input": 0.000015, "output": 0.000075}'::jsonb
    WHEN 'claude-3-sonnet' THEN '{"input": 0.000003, "output": 0.000015}'::jsonb
    WHEN 'claude-3-haiku' THEN '{"input": 0.00000025, "output": 0.00000125}'::jsonb
    WHEN 'gemini' THEN '{"input": 0.00000125, "output": 0.000005}'::jsonb
    WHEN 'gemini-pro' THEN '{"input": 0.00000125, "output": 0.000005}'::jsonb
    WHEN 'gemini-pro-vision' THEN '{"input": 0.00000125, "output": 0.000005}'::jsonb
    WHEN 'llama' THEN '{"input": 0.0000002, "output": 0.0000008}'::jsonb
    WHEN 'deepseek' THEN '{"input": 0.00000014, "output": 0.00000028}'::jsonb
    WHEN 'groq' THEN '{"input": 0.00000027, "output": 0.00000027}'::jsonb
    ELSE '{"input": 0.000001, "output": 0.000001}'::jsonb
  END INTO model_config;
  
  cost_per_input := (model_config->>'input')::NUMERIC;
  cost_per_output := (model_config->>'output')::NUMERIC;
  total_cost := (p_input_tokens * cost_per_input) + (p_output_tokens * cost_per_output);
  tokens_per_sec := CASE 
    WHEN p_response_time > 0 THEN (p_input_tokens + p_output_tokens) * 1000.0 / p_response_time
    ELSE 0
  END;
  
  INSERT INTO llm_metrics (
    provider,
    model,
    response_time,
    tokens_per_second,
    input_tokens,
    output_tokens,
    total_tokens,
    cost_per_token,
    total_cost,
    quality_score,
    confidence,
    success_rate,
    session_id,
    user_role,
    query_length,
    has_image,
    error_message
  ) VALUES (
    p_provider,
    p_model,
    p_response_time,
    tokens_per_sec,
    p_input_tokens,
    p_output_tokens,
    p_input_tokens + p_output_tokens,
    cost_per_output,
    total_cost,
    p_quality_score,
    CASE WHEN p_success THEN 0.9 ELSE 0.1 END,
    CASE WHEN p_success THEN 100.0 ELSE 0.0 END,
    p_session_id,
    p_user_role,
    p_query_length,
    p_has_image,
    p_error_message
  )
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$;

-- Enable Row Level Security
ALTER TABLE llm_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read metrics
CREATE POLICY "Allow authenticated read access" ON llm_metrics
  FOR SELECT TO authenticated
  USING (true);

-- Create policy for service role to insert metrics
CREATE POLICY "Allow service role insert" ON llm_metrics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON llm_metrics TO authenticated;
GRANT SELECT ON llm_model_performance TO authenticated;
GRANT SELECT ON llm_daily_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_model_comparison(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_model(TEXT, INTEGER) TO authenticated;

GRANT ALL ON llm_metrics TO service_role;
GRANT EXECUTE ON FUNCTION record_model_usage TO service_role;

-- Create comment for documentation
COMMENT ON TABLE llm_metrics IS 'Stores performance metrics for different LLM providers and models';
COMMENT ON FUNCTION get_model_comparison IS 'Returns ranked comparison of all models based on performance metrics';
COMMENT ON FUNCTION get_best_model IS 'Returns the best model for specific criteria (speed, quality, cost, balanced)';
COMMENT ON FUNCTION record_model_usage IS 'Records a model usage event with performance metrics';