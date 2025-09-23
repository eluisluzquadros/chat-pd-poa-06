-- Fix remaining Security Definer Views
-- Convert the last 3 views to SECURITY INVOKER to address security warnings

-- Drop and recreate the remaining views with SECURITY INVOKER
DROP VIEW IF EXISTS quality_metrics_daily CASCADE;
DROP VIEW IF EXISTS quality_metrics_hourly CASCADE;
DROP VIEW IF EXISTS token_usage_summary CASCADE;

-- Recreate quality_metrics_daily with SECURITY INVOKER
CREATE VIEW quality_metrics_daily 
WITH (security_invoker = true) AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_queries,
    AVG(response_time) AS avg_response_time,
    (SUM(CASE WHEN has_beta_message THEN 1 ELSE 0 END)::DOUBLE PRECISION / COUNT(*)::DOUBLE PRECISION) AS beta_rate,
    (SUM(CASE WHEN has_valid_response THEN 1 ELSE 0 END)::DOUBLE PRECISION / COUNT(*)::DOUBLE PRECISION) AS valid_response_rate,
    AVG(confidence) AS avg_confidence,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM quality_metrics
GROUP BY DATE(created_at);

-- Recreate quality_metrics_hourly with SECURITY INVOKER  
CREATE VIEW quality_metrics_hourly 
WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS total_queries,
    AVG(response_time) AS avg_response_time,
    (SUM(CASE WHEN has_beta_message THEN 1 ELSE 0 END)::DOUBLE PRECISION / COUNT(*)::DOUBLE PRECISION) AS beta_rate,
    AVG(confidence) AS avg_confidence,
    category,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM quality_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), category;

-- Recreate token_usage_summary with SECURITY INVOKER
CREATE VIEW token_usage_summary 
WITH (security_invoker = true) AS
SELECT 
    user_id,
    model,
    DATE(created_at) AS usage_date,
    COUNT(*) AS message_count,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost
FROM token_usage
GROUP BY user_id, model, DATE(created_at);

-- Grant appropriate permissions
GRANT SELECT ON quality_metrics_daily TO authenticated, anon;
GRANT SELECT ON quality_metrics_hourly TO authenticated, anon;
GRANT SELECT ON token_usage_summary TO authenticated, anon;

-- Grant full access to service role
GRANT ALL ON quality_metrics_daily TO service_role;
GRANT ALL ON quality_metrics_hourly TO service_role;
GRANT ALL ON token_usage_summary TO service_role;

-- Log the security fix
INSERT INTO audit_log (action, table_name, new_values) 
VALUES (
  'security_fix_views', 
  'remaining_definer_views', 
  jsonb_build_object(
    'description', 'Converted remaining 3 SECURITY DEFINER views to SECURITY INVOKER',
    'views_fixed', ARRAY['quality_metrics_daily', 'quality_metrics_hourly', 'token_usage_summary'],
    'timestamp', NOW()::text
  )
);

-- Verify all views now use SECURITY INVOKER or default
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_definer%' THEN 'SECURITY_DEFINER'
        WHEN definition ILIKE '%security_invoker%' THEN 'SECURITY_INVOKER'
        ELSE 'DEFAULT_INVOKER'
    END AS security_mode
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY 
    CASE 
        WHEN definition ILIKE '%security_definer%' THEN 1
        ELSE 2
    END,
    viewname;