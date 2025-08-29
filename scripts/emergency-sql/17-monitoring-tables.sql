-- FASE 5 - Monitoramento e Dashboard para Agentic-RAG V3
-- Criação de estrutura completa de monitoramento com métricas, alertas e A/B testing

-- ============================================================================
-- 1. SISTEMA DE MÉTRICAS E PERFORMANCE
-- ============================================================================

-- Tabela principal para métricas de performance
CREATE TABLE IF NOT EXISTS rag_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT, -- Changed from UUID reference to TEXT
    user_id TEXT, -- Changed from UUID reference to TEXT
    
    -- Identificação da versão e query
    rag_version TEXT NOT NULL DEFAULT 'v3', -- v2, v3, etc.
    query_text TEXT NOT NULL,
    query_category TEXT, -- legal, zoning, risk, construction, etc.
    query_hash TEXT, -- hash da query para deduplicação
    
    -- Métricas de tempo (em milliseconds)
    total_latency INTEGER NOT NULL, -- tempo total da resposta
    analyzer_latency INTEGER, -- tempo do query-analyzer
    sql_generator_latency INTEGER, -- tempo do sql-generator  
    vector_search_latency INTEGER, -- tempo do vector search
    synthesizer_latency INTEGER, -- tempo do response-synthesizer
    
    -- Métricas de qualidade
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00
    has_results BOOLEAN DEFAULT false,
    result_count INTEGER DEFAULT 0,
    refinement_count INTEGER DEFAULT 0, -- quantas vezes refinou
    
    -- Métricas de tokens/custo
    total_tokens INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6) DEFAULT 0.00, -- em USD
    
    -- Status e erros
    status TEXT NOT NULL DEFAULT 'success', -- success, error, timeout
    error_message TEXT,
    error_code TEXT,
    
    -- Metadados
    llm_model TEXT, -- modelo usado
    user_agent TEXT, -- browser/app info
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_rag_metrics_session_id ON rag_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_user_id ON rag_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_version ON rag_metrics(rag_version);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_category ON rag_metrics(query_category);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_status ON rag_metrics(status);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_created_at ON rag_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_hash_time ON rag_metrics(query_hash, created_at);

-- ============================================================================
-- 2. SISTEMA DE FEEDBACK DOS USUÁRIOS
-- ============================================================================

-- Tabela para coleta de feedback
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT, -- Changed from UUID reference to TEXT
    user_id TEXT, -- Changed from UUID reference to TEXT
    metric_id UUID REFERENCES rag_metrics(id),
    
    -- Feedback básico
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 estrelas
    is_helpful BOOLEAN, -- true/false para útil/não útil
    is_accurate BOOLEAN, -- verdadeiro/falso
    is_complete BOOLEAN, -- completo/incompleto
    
    -- Feedback detalhado
    feedback_text TEXT, -- comentário livre
    feedback_category TEXT, -- accuracy, completeness, relevance, speed
    
    -- Classificação de problemas
    problem_type TEXT, -- wrong_info, incomplete, slow, confusing, irrelevant
    expected_result TEXT, -- o que o usuário esperava
    
    -- Metadados
    feedback_source TEXT DEFAULT 'chat', -- chat, admin, api
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_session_id ON user_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_metric_id ON user_feedback(metric_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- ============================================================================
-- 3. SISTEMA DE ALERTAS E MONITORAMENTO
-- ============================================================================

-- Tabela para configuração de alertas
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Condições do alerta
    metric_type TEXT NOT NULL, -- latency, error_rate, success_rate, etc.
    threshold_value DECIMAL(10,2) NOT NULL,
    comparison_operator TEXT NOT NULL DEFAULT '>' CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=')),
    time_window_minutes INTEGER DEFAULT 5, -- janela de tempo para avaliar
    
    -- Configurações
    is_active BOOLEAN DEFAULT true,
    severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Notificações
    notification_channels TEXT[], -- email, slack, webhook
    notification_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para alertas disparados
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    
    -- Detalhes do evento
    alert_message TEXT NOT NULL,
    current_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    severity TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT, -- Changed from UUID reference to TEXT
    
    -- Metadados
    affected_queries INTEGER DEFAULT 0,
    time_window_start TIMESTAMPTZ,
    time_window_end TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_events_rule_id ON alert_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_status ON alert_events(status);
CREATE INDEX IF NOT EXISTS idx_alert_events_severity ON alert_events(severity);
CREATE INDEX IF NOT EXISTS idx_alert_events_created_at ON alert_events(created_at);

-- ============================================================================
-- 4. SISTEMA DE A/B TESTING
-- ============================================================================

-- Tabela para configuração de experimentos A/B
CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Configuração do experimento
    control_version TEXT NOT NULL DEFAULT 'v2', -- versão controle
    treatment_version TEXT NOT NULL DEFAULT 'v3', -- versão de tratamento
    traffic_split DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (traffic_split > 0 AND traffic_split < 1), -- % para treatment
    
    -- Critérios de inclusão
    include_user_types TEXT[] DEFAULT ARRAY['all'], -- all, admin, beta, etc.
    include_query_categories TEXT[], -- legal, zoning, etc.
    exclude_user_ids UUID[], -- usuários excluídos
    
    -- Status e duração
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    min_sample_size INTEGER DEFAULT 100, -- mínimo de queries por grupo
    
    -- Métricas de sucesso
    primary_metric TEXT NOT NULL DEFAULT 'user_satisfaction', -- user_satisfaction, latency, accuracy
    secondary_metrics TEXT[] DEFAULT ARRAY['latency', 'accuracy', 'completeness'],
    
    -- Resultados
    control_group_size INTEGER DEFAULT 0,
    treatment_group_size INTEGER DEFAULT 0,
    statistical_significance DECIMAL(5,4), -- p-value
    winner TEXT, -- control, treatment, inconclusive
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastreamento de participantes do A/B test
CREATE TABLE IF NOT EXISTS ab_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id TEXT, -- Changed from UUID reference to TEXT
    session_id TEXT, -- Changed from UUID reference to TEXT
    
    -- Atribuição
    assigned_version TEXT NOT NULL, -- control ou treatment
    assignment_reason TEXT, -- random, inclusion_criteria, etc.
    
    -- Metadados
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_participants_experiment_id ON ab_participants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_participants_user_id ON ab_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_participants_assigned_version ON ab_participants(assigned_version);

-- ============================================================================
-- 5. VIEWS PARA DASHBOARD
-- ============================================================================

-- View para métricas agregadas por período
CREATE OR REPLACE VIEW rag_metrics_hourly AS
SELECT 
    date_trunc('hour', created_at) as hour,
    rag_version,
    query_category,
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE status = 'success') as successful_queries,
    COUNT(*) FILTER (WHERE status = 'error') as failed_queries,
    ROUND(AVG(total_latency)::numeric, 0) as avg_latency,
    ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
    SUM(total_tokens) as total_tokens_used,
    SUM(estimated_cost) as total_cost
FROM rag_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- View para alertas ativos
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    ae.id,
    ar.name as rule_name,
    ae.alert_message,
    ae.current_value,
    ae.threshold_value,
    ae.severity,
    ae.created_at,
    EXTRACT(EPOCH FROM NOW() - ae.created_at)/60 as minutes_active
FROM alert_events ae
JOIN alert_rules ar ON ae.rule_id = ar.id
WHERE ae.status = 'active'
ORDER BY ae.created_at DESC;

-- View para performance por categoria
CREATE OR REPLACE VIEW performance_by_category AS
SELECT 
    query_category,
    rag_version,
    COUNT(*) as query_count,
    ROUND(AVG(total_latency)::numeric, 0) as avg_latency,
    ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
    COUNT(*) FILTER (WHERE has_results = true) as queries_with_results,
    ROUND(100.0 * COUNT(*) FILTER (WHERE has_results = true) / COUNT(*), 1) as success_rate_pct
FROM rag_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY query_category, rag_version
ORDER BY query_count DESC;

-- ============================================================================
-- 6. FUNÇÕES PARA CÁLCULO DE MÉTRICAS
-- ============================================================================

-- Função para calcular taxa de erro por período
CREATE OR REPLACE FUNCTION calculate_error_rate(
    p_minutes INTEGER DEFAULT 5,
    p_version TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    error_rate DECIMAL;
BEGIN
    SELECT 
        COALESCE(
            100.0 * COUNT(*) FILTER (WHERE status != 'success') / NULLIF(COUNT(*), 0), 
            0
        )
    INTO error_rate
    FROM rag_metrics
    WHERE created_at >= NOW() - INTERVAL '1 minute' * p_minutes
        AND (p_version IS NULL OR rag_version = p_version);
    
    RETURN COALESCE(error_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Função para calcular latência P95
CREATE OR REPLACE FUNCTION calculate_p95_latency(
    p_minutes INTEGER DEFAULT 5,
    p_version TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    p95_latency INTEGER;
BEGIN
    SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_latency)
    INTO p95_latency
    FROM rag_metrics
    WHERE created_at >= NOW() - INTERVAL '1 minute' * p_minutes
        AND status = 'success'
        AND (p_version IS NULL OR rag_version = p_version);
    
    RETURN COALESCE(p95_latency, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGERS PARA ALERTAS AUTOMÁTICOS
-- ============================================================================

-- Função para verificar alertas
CREATE OR REPLACE FUNCTION check_alert_conditions()
RETURNS TRIGGER AS $$
DECLARE
    rule RECORD;
    current_value DECIMAL;
    should_alert BOOLEAN;
BEGIN
    -- Verificar todas as regras de alerta ativas
    FOR rule IN SELECT * FROM alert_rules WHERE is_active = true LOOP
        should_alert := false;
        
        -- Calcular valor atual baseado no tipo de métrica
        CASE rule.metric_type
            WHEN 'error_rate' THEN
                current_value := calculate_error_rate(rule.time_window_minutes);
            WHEN 'p95_latency' THEN
                current_value := calculate_p95_latency(rule.time_window_minutes);
            WHEN 'avg_latency' THEN
                SELECT AVG(total_latency) INTO current_value
                FROM rag_metrics
                WHERE created_at >= NOW() - INTERVAL '1 minute' * rule.time_window_minutes;
            ELSE
                CONTINUE;
        END CASE;
        
        -- Verificar se a condição do alerta foi atendida
        CASE rule.comparison_operator
            WHEN '>' THEN should_alert := current_value > rule.threshold_value;
            WHEN '<' THEN should_alert := current_value < rule.threshold_value;
            WHEN '>=' THEN should_alert := current_value >= rule.threshold_value;
            WHEN '<=' THEN should_alert := current_value <= rule.threshold_value;
            WHEN '=' THEN should_alert := current_value = rule.threshold_value;
        END CASE;
        
        -- Criar alerta se condição foi atendida e não há alerta ativo
        IF should_alert AND NOT EXISTS (
            SELECT 1 FROM alert_events 
            WHERE rule_id = rule.id 
                AND status = 'active' 
                AND created_at >= NOW() - INTERVAL '1 minute' * rule.time_window_minutes
        ) THEN
            INSERT INTO alert_events (
                rule_id, 
                alert_message, 
                current_value, 
                threshold_value, 
                severity,
                time_window_start,
                time_window_end
            ) VALUES (
                rule.id,
                COALESCE(rule.notification_message, rule.name || ' triggered'),
                current_value,
                rule.threshold_value,
                rule.severity,
                NOW() - INTERVAL '1 minute' * rule.time_window_minutes,
                NOW()
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar alertas após inserção de métricas
CREATE OR REPLACE TRIGGER trigger_check_alerts
    AFTER INSERT ON rag_metrics
    FOR EACH ROW
    EXECUTE FUNCTION check_alert_conditions();

-- ============================================================================
-- 8. CONFIGURAÇÕES INICIAIS DE ALERTAS
-- ============================================================================

-- Inserir regras de alerta padrão
INSERT INTO alert_rules (name, description, metric_type, threshold_value, comparison_operator, time_window_minutes, severity, notification_channels, notification_message)
VALUES 
    ('High Latency Alert', 'Alerta quando latência P95 > 5 segundos', 'p95_latency', 5000, '>', 5, 'warning', ARRAY['email'], 'Latência alta detectada: {{current_value}}ms (limite: {{threshold_value}}ms)'),
    ('High Error Rate', 'Alerta quando taxa de erro > 5%', 'error_rate', 5.0, '>', 5, 'error', ARRAY['email', 'slack'], 'Taxa de erro alta: {{current_value}}% (limite: {{threshold_value}}%)'),
    ('Critical Latency', 'Alerta crítico quando latência P95 > 10 segundos', 'p95_latency', 10000, '>', 3, 'critical', ARRAY['email', 'slack'], 'CRÍTICO: Latência muito alta: {{current_value}}ms'),
    ('System Overload', 'Alerta quando taxa de erro > 15%', 'error_rate', 15.0, '>', 3, 'critical', ARRAY['email', 'slack'], 'CRÍTICO: Sistema sobrecarregado - {{current_value}}% de erros')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    threshold_value = EXCLUDED.threshold_value,
    updated_at = NOW();

-- ============================================================================
-- 9. PERMISSÕES E SEGURANÇA
-- ============================================================================

-- RLS para rag_metrics - usuários só veem suas próprias métricas
ALTER TABLE rag_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON rag_metrics
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "System can insert metrics" ON rag_metrics
    FOR INSERT WITH CHECK (true);

-- RLS para user_feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback" ON user_feedback
    FOR ALL USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Alertas apenas para admins
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only alert access" ON alert_rules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin only alert events" ON alert_events
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- A/B testing apenas para admins
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only experiments" ON ab_experiments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can view own participation" ON ab_participants
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "System can manage participants" ON ab_participants
    FOR INSERT WITH CHECK (true);

COMMENT ON TABLE rag_metrics IS 'Sistema completo de métricas para Agentic-RAG V3 com tracking de performance, tokens e custos';
COMMENT ON TABLE user_feedback IS 'Sistema de coleta de feedback dos usuários com múltiplas dimensões de avaliação';
COMMENT ON TABLE alert_rules IS 'Configuração de regras de alertas automáticos para monitoramento do sistema';
COMMENT ON TABLE alert_events IS 'Eventos de alertas disparados com tracking de resolução';
COMMENT ON TABLE ab_experiments IS 'Sistema de A/B testing para comparação de versões (V2 vs V3)';
COMMENT ON TABLE ab_participants IS 'Rastreamento de participantes em experimentos A/B';