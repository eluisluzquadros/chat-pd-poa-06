-- Tables for Knowledge Gap Detection and Resolution System

-- Table to store detected knowledge gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')) NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.60,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Gap details
    failed_query TEXT NOT NULL,
    expected_answer TEXT,
    actual_answer TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Pattern analysis
    similar_failures_count INTEGER DEFAULT 1,
    failure_pattern TEXT,
    suggested_action TEXT,
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'detected' CHECK (status IN ('detected', 'analyzing', 'pending_content', 'pending_review', 'approved', 'resolved')),
    priority_score INTEGER DEFAULT 1,
    
    -- Resolution tracking
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Metadata
    created_by UUID DEFAULT auth.uid(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(category, topic, failed_query)
);

-- Table to store generated content for knowledge gaps
CREATE TABLE IF NOT EXISTS knowledge_gap_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_id UUID REFERENCES knowledge_gaps(id) ON DELETE CASCADE,
    
    -- Content details
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'structured')),
    
    -- Content metadata
    language VARCHAR(10) DEFAULT 'pt-BR',
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    -- Quality metrics
    completeness_score DECIMAL(3,2),
    accuracy_confidence DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    
    -- Approval workflow
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Content placement
    suggested_location TEXT,
    integration_notes TEXT,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Content source
    generated_by VARCHAR(50) DEFAULT 'ai' CHECK (generated_by IN ('ai', 'human', 'hybrid')),
    generation_model VARCHAR(100),
    generation_prompt TEXT
);

-- Table to track knowledge gap resolution history
CREATE TABLE IF NOT EXISTS knowledge_gap_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_id UUID REFERENCES knowledge_gaps(id) ON DELETE CASCADE,
    content_id UUID REFERENCES knowledge_gap_content(id),
    
    -- Resolution details
    resolution_type VARCHAR(50) CHECK (resolution_type IN ('new_content', 'existing_update', 'redirect', 'clarification')),
    effectiveness_score DECIMAL(3,2),
    
    -- Integration tracking
    integrated_into_documents UUID[] DEFAULT '{}',
    embeddings_updated BOOLEAN DEFAULT FALSE,
    search_performance_improved BOOLEAN DEFAULT FALSE,
    
    -- Quality metrics after resolution
    post_resolution_confidence DECIMAL(3,2),
    similar_queries_resolved INTEGER DEFAULT 0,
    user_satisfaction_score DECIMAL(3,2),
    
    -- Tracking
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_by UUID REFERENCES auth.users(id),
    notes TEXT,
    
    -- Learning data
    learned_patterns JSONB DEFAULT '{}'::jsonb,
    improvement_suggestions TEXT[]
);

-- Table to store confidence monitoring data
CREATE TABLE IF NOT EXISTS confidence_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    category VARCHAR(100),
    
    -- Confidence metrics
    initial_confidence DECIMAL(3,2) NOT NULL,
    final_confidence DECIMAL(3,2),
    confidence_threshold DECIMAL(3,2) DEFAULT 0.60,
    
    -- Response quality
    response_provided BOOLEAN NOT NULL,
    response_quality VARCHAR(20) CHECK (response_quality IN ('excellent', 'good', 'poor', 'no_answer')),
    user_feedback_score INTEGER,
    
    -- Gap detection
    gap_detected BOOLEAN DEFAULT FALSE,
    gap_id UUID REFERENCES knowledge_gaps(id),
    auto_escalated BOOLEAN DEFAULT FALSE,
    
    -- Context
    session_id VARCHAR(100),
    user_id UUID,
    model_used VARCHAR(100),
    
    -- Timing
    monitored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    
    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table for learning patterns and incremental improvements
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) CHECK (pattern_type IN ('query_pattern', 'failure_pattern', 'success_pattern', 'resolution_pattern')),
    
    -- Pattern details
    pattern_name VARCHAR(200) NOT NULL,
    pattern_description TEXT,
    pattern_data JSONB NOT NULL,
    
    -- Effectiveness tracking
    occurrence_count INTEGER DEFAULT 1,
    success_rate DECIMAL(3,2),
    confidence_improvement DECIMAL(3,2),
    
    -- Categories and topics
    categories TEXT[] DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Learning metadata
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effectiveness_score DECIMAL(3,2),
    
    -- Application tracking
    applied_to_gaps UUID[] DEFAULT '{}',
    automated_applications INTEGER DEFAULT 0,
    manual_applications INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_severity ON knowledge_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_category ON knowledge_gaps(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_detected_at ON knowledge_gaps(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_confidence ON knowledge_gaps(confidence_score);

CREATE INDEX IF NOT EXISTS idx_knowledge_gap_content_status ON knowledge_gap_content(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gap_content_gap_id ON knowledge_gap_content(gap_id);

CREATE INDEX IF NOT EXISTS idx_confidence_monitoring_threshold ON confidence_monitoring(initial_confidence) WHERE initial_confidence < 0.60;
CREATE INDEX IF NOT EXISTS idx_confidence_monitoring_gap_detected ON confidence_monitoring(gap_detected) WHERE gap_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_confidence_monitoring_monitored_at ON confidence_monitoring(monitored_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_effectiveness ON learning_patterns(effectiveness_score DESC);

-- RLS (Row Level Security) policies
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gap_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gap_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for admins and authenticated users
CREATE POLICY "Admins can manage knowledge gaps" ON knowledge_gaps
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view knowledge gaps" ON knowledge_gaps
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage gap content" ON knowledge_gap_content
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view approved content" ON knowledge_gap_content
    FOR SELECT USING (status = 'approved' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage resolutions" ON knowledge_gap_resolutions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert confidence monitoring" ON confidence_monitoring
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view confidence monitoring" ON confidence_monitoring
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "System can manage learning patterns" ON learning_patterns
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_knowledge_gap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_knowledge_gaps_updated_at
    BEFORE UPDATE ON knowledge_gaps
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_gap_updated_at();

CREATE TRIGGER trigger_knowledge_gap_content_updated_at
    BEFORE UPDATE ON knowledge_gap_content
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_gap_updated_at();

-- Function to automatically detect knowledge gaps
CREATE OR REPLACE FUNCTION detect_knowledge_gap(
    p_query TEXT,
    p_confidence DECIMAL,
    p_category VARCHAR DEFAULT NULL,
    p_response TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    gap_id UUID;
    existing_gap UUID;
BEGIN
    -- Check if a similar gap already exists
    SELECT id INTO existing_gap
    FROM knowledge_gaps
    WHERE category = COALESCE(p_category, 'general')
      AND similarity(failed_query, p_query) > 0.7
      AND status NOT IN ('resolved');
    
    IF existing_gap IS NOT NULL THEN
        -- Update existing gap with new failure
        UPDATE knowledge_gaps
        SET similar_failures_count = similar_failures_count + 1,
            updated_at = NOW(),
            confidence_score = LEAST(confidence_score, p_confidence)
        WHERE id = existing_gap;
        
        RETURN existing_gap;
    ELSE
        -- Create new gap
        INSERT INTO knowledge_gaps (
            category,
            topic,
            severity,
            failed_query,
            actual_answer,
            confidence_score,
            suggested_action
        ) VALUES (
            COALESCE(p_category, 'general'),
            CASE 
                WHEN p_query ILIKE '%coeficiente%' THEN 'coeficiente'
                WHEN p_query ILIKE '%altura%' THEN 'altura'
                WHEN p_query ILIKE '%zoneamento%' THEN 'zoneamento'
                WHEN p_query ILIKE '%bairro%' THEN 'bairros'
                ELSE 'geral'
            END,
            CASE 
                WHEN p_confidence < 0.20 THEN 'critical'
                WHEN p_confidence < 0.40 THEN 'high'
                WHEN p_confidence < 0.60 THEN 'medium'
                ELSE 'low'
            END,
            p_query,
            p_response,
            p_confidence,
            'Analisar e adicionar conteúdo específico sobre este tópico'
        ) RETURNING id INTO gap_id;
        
        RETURN gap_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE knowledge_gaps IS 'Stores detected knowledge gaps when AI confidence is low';
COMMENT ON TABLE knowledge_gap_content IS 'Generated content to fill knowledge gaps';
COMMENT ON TABLE knowledge_gap_resolutions IS 'Track how gaps were resolved and their effectiveness';
COMMENT ON TABLE confidence_monitoring IS 'Real-time monitoring of AI confidence levels';
COMMENT ON TABLE learning_patterns IS 'Patterns learned from successful gap resolutions';