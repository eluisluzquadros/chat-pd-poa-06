-- Fix Security Definer Views by converting to SECURITY INVOKER
-- This addresses the Security Definer View linter warnings

-- Drop and recreate views as SECURITY INVOKER
DROP VIEW IF EXISTS agent_performance_stats CASCADE;
DROP VIEW IF EXISTS anexos_summary CASCADE;
DROP VIEW IF EXISTS benchmark_analysis CASCADE;
DROP VIEW IF EXISTS cache_statistics CASCADE;
DROP VIEW IF EXISTS cost_projections CASCADE;
DROP VIEW IF EXISTS feedback_statistics CASCADE;
DROP VIEW IF EXISTS model_feedback_stats CASCADE;
DROP VIEW IF EXISTS qa_quality_monitoring CASCADE;
DROP VIEW IF EXISTS qa_validation_token_stats CASCADE;

-- Recreate all views with SECURITY INVOKER (which is the default, safer option)
CREATE VIEW agent_performance_stats 
WITH (security_invoker = true) AS
SELECT 
    agent_type,
    COUNT(*) AS total_executions,
    AVG(execution_time) AS avg_execution_time,
    AVG(confidence) AS avg_confidence,
    (COUNT(*) FILTER (WHERE success = true)::FLOAT / COUNT(*)::FLOAT * 100) AS success_rate,
    AVG(records_processed) AS avg_records_processed,
    DATE_TRUNC('day', created_at) AS execution_date
FROM agent_performance_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_type, DATE_TRUNC('day', created_at)
ORDER BY DATE_TRUNC('day', created_at) DESC, agent_type;

CREATE VIEW anexos_summary 
WITH (security_invoker = true) AS
SELECT 
    document_type,
    anexo_type,
    COUNT(*) AS total,
    COUNT(CASE WHEN is_processed THEN 1 END) AS processed,
    COUNT(CASE WHEN NOT is_processed THEN 1 END) AS pending,
    ROUND((COUNT(CASE WHEN is_processed THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 1) AS percent_complete
FROM legal_anexos
GROUP BY document_type, anexo_type
ORDER BY document_type, anexo_type;

CREATE VIEW benchmark_analysis 
WITH (security_invoker = true) AS
SELECT 
    b.timestamp,
    s.summary->>'provider' AS provider,
    s.summary->>'model' AS model,
    (s.summary->>'avgResponseTime')::DOUBLE PRECISION AS avg_response_time,
    (s.summary->>'avgQualityScore')::DOUBLE PRECISION AS avg_quality_score,
    (s.summary->>'successRate')::DOUBLE PRECISION AS success_rate,
    (s.summary->>'avgCostPerQuery')::DOUBLE PRECISION AS avg_cost_per_query,
    (s.summary->>'totalCost')::DOUBLE PRECISION AS total_cost,
    s.summary->>'recommendation' AS recommendation
FROM qa_benchmarks b,
LATERAL jsonb_array_elements(b.summaries) s(summary)
ORDER BY b.timestamp DESC, (s.summary->>'avgQualityScore')::DOUBLE PRECISION DESC;

CREATE VIEW cache_statistics 
WITH (security_invoker = true) AS
SELECT 
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE hit_count > 1) AS cached_hits,
    COALESCE(AVG(hit_count), 0) AS avg_hits,
    COALESCE(MAX(hit_count), 0) AS max_hits,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) AS active_entries,
    COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) AS expired_entries,
    COALESCE(AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL), 0) AS avg_response_time,
    COUNT(DISTINCT query_type) AS query_types
FROM query_cache;

CREATE VIEW cost_projections 
WITH (security_invoker = true) AS
WITH daily_stats AS (
    SELECT 
        DATE(created_at) AS usage_date,
        COUNT(DISTINCT user_id) AS active_users,
        COUNT(*) AS total_queries,
        SUM(total_tokens) AS total_tokens,
        SUM(cost) AS daily_cost
    FROM llm_metrics
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
),
averages AS (
    SELECT 
        AVG(active_users) AS avg_daily_users,
        AVG(total_queries) AS avg_daily_queries,
        AVG(total_tokens) AS avg_daily_tokens,
        AVG(daily_cost) AS avg_daily_cost,
        CASE 
            WHEN AVG(active_users) > 0 THEN AVG(total_queries) / AVG(active_users)
            ELSE 0
        END AS avg_queries_per_user
    FROM daily_stats
)
SELECT 
    avg_daily_users,
    avg_daily_queries,
    avg_queries_per_user,
    avg_daily_tokens,
    avg_daily_cost,
    avg_daily_cost * 30 AS projected_monthly_cost,
    avg_daily_cost * 365 AS projected_yearly_cost,
    jsonb_build_object(
        'current', avg_daily_users,
        'growth_10_percent', avg_daily_users * 1.1,
        'growth_25_percent', avg_daily_users * 1.25,
        'growth_50_percent', avg_daily_users * 1.5
    ) AS user_projections
FROM averages;

CREATE VIEW feedback_statistics 
WITH (security_invoker = true) AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_feedback,
    COUNT(*) FILTER (WHERE helpful = true) AS positive_feedback,
    COUNT(*) FILTER (WHERE helpful = false) AS negative_feedback,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND comment != '') AS comments_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE helpful = true)::FLOAT / COUNT(*)::FLOAT) * 100
        ELSE 0
    END AS satisfaction_rate
FROM message_feedback
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE VIEW model_feedback_stats 
WITH (security_invoker = true) AS
SELECT 
    model,
    COUNT(*) AS total_feedback,
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND comment != '') AS comments_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE helpful = true)::FLOAT / COUNT(*)::FLOAT) * 100
        ELSE 0
    END AS satisfaction_rate
FROM message_feedback
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY model
ORDER BY total_feedback DESC;

CREATE VIEW qa_quality_monitoring 
WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('hour', r.created_at) AS hour,
    COUNT(r.id) AS qa_runs,
    COUNT(*) FILTER (WHERE r.is_correct = true)::NUMERIC / NULLIF(COUNT(*), 0) AS qa_accuracy,
    COUNT(*) FILTER (WHERE r.accuracy_score < 0.7) AS low_quality_runs,
    COUNT(f.id) FILTER (WHERE f.helpful = true) AS positive_feedback,
    COUNT(f.id) FILTER (WHERE f.helpful = false) AS negative_feedback,
    CASE 
        WHEN COUNT(f.id) > 0 THEN 
            (COUNT(f.id) FILTER (WHERE f.helpful = true)::FLOAT / COUNT(f.id)::FLOAT) * 100
        ELSE NULL
    END AS user_satisfaction_rate,
    CASE 
        WHEN COUNT(*) FILTER (WHERE r.accuracy_score < 0.7) > 5 THEN 'HIGH'
        WHEN COUNT(*) FILTER (WHERE r.accuracy_score < 0.7) > 2 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS alert_status
FROM qa_validation_results r
LEFT JOIN message_feedback f ON f.created_at >= r.created_at - INTERVAL '1 hour' 
    AND f.created_at <= r.created_at + INTERVAL '1 hour'
WHERE r.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', r.created_at)
ORDER BY hour DESC;

CREATE VIEW qa_validation_token_stats 
WITH (security_invoker = true) AS
SELECT 
    r.validation_run_id,
    r.model,
    r.started_at,
    r.completed_at,
    r.total_tests,
    r.passed_tests,
    r.overall_accuracy,
    SUM(t.input_tokens) AS total_input_tokens,
    SUM(t.output_tokens) AS total_output_tokens,
    SUM(t.total_tokens) AS total_tokens,
    SUM(t.estimated_cost) AS total_estimated_cost,
    CASE 
        WHEN r.total_tests > 0 THEN SUM(t.estimated_cost) / r.total_tests 
        ELSE 0 
    END AS avg_cost_per_test
FROM qa_validation_runs r
LEFT JOIN qa_token_usage t ON t.validation_run_id = r.id
GROUP BY r.validation_run_id, r.model, r.started_at, r.completed_at, 
         r.total_tests, r.passed_tests, r.overall_accuracy
ORDER BY r.started_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- Update pg_stat_statements extension to track query performance
-- This is optional but recommended for monitoring
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Verify views are created with SECURITY INVOKER
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition ILIKE '%security_invoker%' THEN 'SECURITY INVOKER'
        WHEN definition ILIKE '%security_definer%' THEN 'SECURITY DEFINER'
        ELSE 'DEFAULT (INVOKER)'
    END AS security_mode
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;