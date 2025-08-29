-- Tabela para armazenar relatórios de testes automatizados
CREATE TABLE IF NOT EXISTS qa_automated_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date timestamptz NOT NULL,
  scenarios_tested integer NOT NULL,
  all_passed boolean NOT NULL,
  critical_failures integer DEFAULT 0,
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_qa_automated_reports_run_date ON qa_automated_reports(run_date DESC);

-- Permissões
GRANT SELECT ON qa_automated_reports TO authenticated;
GRANT INSERT ON qa_automated_reports TO service_role;

-- View para monitoramento em tempo real
CREATE OR REPLACE VIEW qa_quality_monitoring AS
WITH recent_runs AS (
  SELECT 
    date_trunc('hour', started_at) as hour,
    AVG(overall_accuracy) as avg_accuracy,
    COUNT(*) as run_count,
    SUM(CASE WHEN overall_accuracy < 0.8 THEN 1 ELSE 0 END) as low_quality_runs
  FROM qa_validation_runs
  WHERE started_at >= NOW() - INTERVAL '24 hours'
    AND status = 'completed'
  GROUP BY date_trunc('hour', started_at)
),
recent_feedback AS (
  SELECT 
    date_trunc('hour', created_at) as hour,
    COUNT(CASE WHEN helpful = true THEN 1 END) as positive_feedback,
    COUNT(CASE WHEN helpful = false THEN 1 END) as negative_feedback,
    COUNT(*) as total_feedback
  FROM message_feedback
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', created_at)
)
SELECT 
  COALESCE(r.hour, f.hour) as hour,
  COALESCE(r.avg_accuracy, 0) as qa_accuracy,
  COALESCE(r.run_count, 0) as qa_runs,
  COALESCE(r.low_quality_runs, 0) as low_quality_runs,
  COALESCE(f.positive_feedback, 0) as positive_feedback,
  COALESCE(f.negative_feedback, 0) as negative_feedback,
  CASE 
    WHEN f.total_feedback > 0 THEN (f.positive_feedback::float / f.total_feedback) 
    ELSE NULL 
  END as user_satisfaction_rate,
  -- Alertas
  CASE 
    WHEN r.avg_accuracy < 0.8 THEN 'LOW_ACCURACY'
    WHEN r.low_quality_runs > 2 THEN 'MULTIPLE_FAILURES'
    WHEN f.negative_feedback > f.positive_feedback THEN 'USER_DISSATISFACTION'
    ELSE 'OK'
  END as alert_status
FROM recent_runs r
FULL OUTER JOIN recent_feedback f ON r.hour = f.hour
ORDER BY hour DESC;

-- Permissões para a view
GRANT SELECT ON qa_quality_monitoring TO authenticated;