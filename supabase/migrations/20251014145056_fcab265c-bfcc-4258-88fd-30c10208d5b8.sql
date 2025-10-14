-- ============================================
-- FASE 2: Tabela de Insights de Mensagens (CORRIGIDA)
-- ============================================

CREATE TABLE message_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  
  -- Análise de sentimento
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  sentiment_score NUMERIC(3,2),
  
  -- Análise de intenção
  intent TEXT[],
  
  -- Análise de tópicos
  topics TEXT[],
  
  -- Palavras-chave
  keywords TEXT[],
  
  -- Metadados
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(session_id, user_message)
);

-- Índices para performance
CREATE INDEX idx_message_insights_sentiment ON message_insights(sentiment);
CREATE INDEX idx_message_insights_topics ON message_insights USING GIN(topics);
CREATE INDEX idx_message_insights_keywords ON message_insights USING GIN(keywords);
CREATE INDEX idx_message_insights_date ON message_insights(created_at);
CREATE INDEX idx_message_insights_session ON message_insights(session_id);

-- RLS Policies
ALTER TABLE message_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors can view insights"
  ON message_insights FOR SELECT
  USING (is_supervisor_or_admin());

CREATE POLICY "Service role can manage insights"
  ON message_insights FOR ALL
  USING ((auth.jwt()->>'role')::text = 'service_role');

-- ============================================
-- FASE 4: Tabela de Alertas Inteligentes
-- ============================================

CREATE TABLE intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_intelligence_alerts_type ON intelligence_alerts(alert_type);
CREATE INDEX idx_intelligence_alerts_severity ON intelligence_alerts(severity);
CREATE INDEX idx_intelligence_alerts_acknowledged ON intelligence_alerts(acknowledged);

-- RLS Policies
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage intelligence alerts"
  ON intelligence_alerts FOR ALL
  USING (is_admin());

CREATE POLICY "Supervisors can view intelligence alerts"
  ON intelligence_alerts FOR SELECT
  USING (is_supervisor_or_admin());

-- ============================================
-- FASE 2: Função para Top Topics (CORRIGIDA)
-- ============================================

CREATE OR REPLACE FUNCTION get_top_topics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  topic TEXT,
  count BIGINT,
  avg_sentiment_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(topics) as topic,
    COUNT(*) as count,
    AVG(sentiment_score) as avg_sentiment_score
  FROM message_insights
  WHERE created_at BETWEEN start_date AND end_date
    AND topics IS NOT NULL
  GROUP BY topic
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FASE 6: Materialized View para Dashboard (CORRIGIDA)
-- ============================================

CREATE MATERIALIZED VIEW mv_daily_insights AS
SELECT 
  DATE(mi.created_at) as date,
  mi.sentiment,
  COUNT(*) as message_count,
  AVG(mi.sentiment_score) as avg_sentiment,
  COUNT(DISTINCT cs.user_id) as unique_users
FROM message_insights mi
JOIN chat_sessions cs ON mi.session_id = cs.id
WHERE mi.topics IS NOT NULL
GROUP BY DATE(mi.created_at), mi.sentiment;

CREATE UNIQUE INDEX ON mv_daily_insights(date, sentiment);

-- ============================================
-- FASE 6: Função para Refresh da Materialized View
-- ============================================

CREATE OR REPLACE FUNCTION refresh_daily_insights()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;