# SQL para Executar no Supabase

Execute este SQL diretamente no editor SQL do Supabase Dashboard:

```sql
-- Create table for QA token usage tracking
CREATE TABLE IF NOT EXISTS qa_token_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_run_id uuid REFERENCES qa_validation_runs(id) ON DELETE CASCADE,
  test_case_id uuid REFERENCES qa_test_cases(id),
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  estimated_cost numeric(10,6),
  created_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_qa_token_usage_validation_run ON qa_token_usage(validation_run_id);
CREATE INDEX IF NOT EXISTS idx_qa_token_usage_created_at ON qa_token_usage(created_at);

-- Create view for aggregated token stats
CREATE OR REPLACE VIEW qa_validation_token_stats AS
SELECT 
  v.id as validation_run_id,
  v.model,
  v.started_at,
  v.completed_at,
  v.total_tests,
  v.passed_tests,
  v.overall_accuracy,
  COALESCE(SUM(t.input_tokens), 0) as total_input_tokens,
  COALESCE(SUM(t.output_tokens), 0) as total_output_tokens,
  COALESCE(SUM(t.total_tokens), 0) as total_tokens,
  COALESCE(SUM(t.estimated_cost), 0) as total_estimated_cost,
  CASE 
    WHEN v.total_tests > 0 THEN COALESCE(SUM(t.estimated_cost), 0) / v.total_tests
    ELSE 0
  END as avg_cost_per_test
FROM qa_validation_runs v
LEFT JOIN qa_token_usage t ON v.id = t.validation_run_id
GROUP BY v.id, v.model, v.started_at, v.completed_at, v.total_tests, v.passed_tests, v.overall_accuracy;

-- Create view for monthly cost projections
CREATE OR REPLACE VIEW cost_projections AS
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as usage_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_queries,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as daily_cost
  FROM token_usage
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
averages AS (
  SELECT
    AVG(active_users) as avg_daily_users,
    AVG(total_queries) as avg_daily_queries,
    AVG(total_tokens) as avg_daily_tokens,
    AVG(daily_cost) as avg_daily_cost,
    CASE WHEN AVG(active_users) > 0 
      THEN AVG(total_queries) / AVG(active_users) 
      ELSE 0 
    END as avg_queries_per_user
  FROM daily_stats
)
SELECT
  avg_daily_users,
  avg_daily_queries,
  avg_queries_per_user,
  avg_daily_tokens,
  avg_daily_cost,
  avg_daily_cost * 30 as projected_monthly_cost,
  avg_daily_cost * 365 as projected_yearly_cost,
  -- Projections for different user counts
  jsonb_build_object(
    '10_users', jsonb_build_object(
      'monthly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 10 * 30,
      'yearly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 10 * 365
    ),
    '100_users', jsonb_build_object(
      'monthly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 100 * 30,
      'yearly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 100 * 365
    ),
    '1000_users', jsonb_build_object(
      'monthly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 1000 * 30,
      'yearly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 1000 * 365
    ),
    '10000_users', jsonb_build_object(
      'monthly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 10000 * 30,
      'yearly', (avg_daily_cost / NULLIF(avg_daily_users, 0)) * 10000 * 365
    )
  ) as user_projections
FROM averages;

-- Grant permissions
GRANT SELECT ON qa_token_usage TO authenticated;
GRANT SELECT ON qa_validation_token_stats TO authenticated;
GRANT SELECT ON cost_projections TO authenticated;
GRANT INSERT ON qa_token_usage TO service_role;
```

## Instruções:

1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole todo o código SQL acima
4. Execute clicando em "Run"
5. Verifique se todas as tabelas e views foram criadas com sucesso

## Verificação:

Após executar, você pode verificar se tudo foi criado corretamente com:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM qa_token_usage LIMIT 1;

-- Verificar se as views foram criadas
SELECT * FROM qa_validation_token_stats LIMIT 1;
SELECT * FROM cost_projections;
```