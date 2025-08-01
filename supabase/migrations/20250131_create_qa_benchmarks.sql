-- Criar tabela para armazenar resultados de benchmark
CREATE TABLE IF NOT EXISTS qa_benchmarks (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    results JSONB NOT NULL, -- Array de BenchmarkResult
    summaries JSONB NOT NULL, -- Array de BenchmarkSummary
    metadata JSONB DEFAULT '{}', -- Metadados adicionais
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_qa_benchmarks_timestamp ON qa_benchmarks(timestamp DESC);
CREATE INDEX idx_qa_benchmarks_metadata ON qa_benchmarks USING GIN (metadata);

-- Criar tabela para casos de teste QA
CREATE TABLE IF NOT EXISTS qa_test_cases (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(100) UNIQUE NOT NULL,
    query TEXT NOT NULL,
    expected_keywords TEXT[] NOT NULL,
    category VARCHAR(50) NOT NULL,
    complexity VARCHAR(20) NOT NULL CHECK (complexity IN ('simple', 'medium', 'high')),
    min_response_length INTEGER,
    expected_response TEXT, -- Resposta ideal esperada
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir casos de teste padrão
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length) VALUES
('greeting_simple', 'oi', ARRAY['olá', 'assistente', 'plano diretor'], 'greeting', 'simple', 50),
('zones_specific', 'Quais são as zonas do Centro Histórico?', ARRAY['ZOT', '08.1', 'Centro Histórico', 'zona'], 'zone_query', 'medium', 200),
('construction_height', 'Qual a altura máxima permitida no bairro Petrópolis?', ARRAY['altura', 'metros', 'Petrópolis', 'máxima'], 'construction_rules', 'medium', 150),
('list_comprehensive', 'Liste todos os bairros de Porto Alegre', ARRAY['bairros', 'Porto Alegre', 'lista'], 'comprehensive_list', 'high', 1000),
('conceptual_plano', 'O que é o Plano Diretor?', ARRAY['plano', 'diretor', 'desenvolvimento', 'urbano', 'município'], 'conceptual', 'medium', 300)
ON CONFLICT (test_id) DO NOTHING;

-- Criar tabela para configurações de modelos
CREATE TABLE IF NOT EXISTS llm_model_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    cost_per_input_token DECIMAL(10, 8) NOT NULL,
    cost_per_output_token DECIMAL(10, 8) NOT NULL,
    max_tokens INTEGER NOT NULL,
    average_latency INTEGER, -- em milissegundos
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '{}', -- capacidades específicas do modelo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, model)
);

-- Inserir configurações de modelos
INSERT INTO llm_model_configs (provider, model, cost_per_input_token, cost_per_output_token, max_tokens, average_latency) VALUES
-- OpenAI
('openai', 'gpt-3.5-turbo', 0.0000015, 0.000002, 4096, 1500),
('openai', 'gpt-3.5-turbo-16k', 0.000003, 0.000004, 16384, 2000),
('openai', 'gpt-4', 0.00003, 0.00006, 8192, 5000),
('openai', 'gpt-4-turbo-preview', 0.00001, 0.00003, 128000, 4000),
-- Anthropic
('anthropic', 'claude-3-haiku-20240307', 0.00000025, 0.00000125, 4096, 1000),
('anthropic', 'claude-3-sonnet-20240229', 0.000003, 0.000015, 4096, 2500),
('anthropic', 'claude-3-opus-20240229', 0.000015, 0.000075, 4096, 4000),
-- Google
('google', 'gemini-pro', 0.00000025, 0.00000125, 30720, 2000),
-- DeepSeek
('deepseek', 'deepseek-chat', 0.0000001, 0.0000002, 4096, 1500),
-- ZhipuAI
('zhipuai', 'glm-4', 0.0000001, 0.0000002, 8192, 2000)
ON CONFLICT (provider, model) DO UPDATE SET
    cost_per_input_token = EXCLUDED.cost_per_input_token,
    cost_per_output_token = EXCLUDED.cost_per_output_token,
    updated_at = NOW();

-- Criar view para análise de performance
CREATE OR REPLACE VIEW benchmark_analysis AS
SELECT 
    b.timestamp,
    s.summary->>'provider' as provider,
    s.summary->>'model' as model,
    (s.summary->>'avgResponseTime')::float as avg_response_time,
    (s.summary->>'avgQualityScore')::float as avg_quality_score,
    (s.summary->>'successRate')::float as success_rate,
    (s.summary->>'avgCostPerQuery')::float as avg_cost_per_query,
    (s.summary->>'totalCost')::float as total_cost,
    s.summary->>'recommendation' as recommendation
FROM qa_benchmarks b,
LATERAL jsonb_array_elements(b.summaries) s(summary)
ORDER BY b.timestamp DESC, avg_quality_score DESC;

-- Função para obter melhor modelo baseado em critérios
CREATE OR REPLACE FUNCTION get_best_model_for_query(
    query_type VARCHAR,
    priority VARCHAR DEFAULT 'balanced' -- 'quality', 'speed', 'cost', 'balanced'
)
RETURNS TABLE (
    provider VARCHAR,
    model VARCHAR,
    score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_benchmark AS (
        SELECT * FROM qa_benchmarks
        ORDER BY timestamp DESC
        LIMIT 1
    ),
    model_scores AS (
        SELECT 
            s.summary->>'provider' as provider,
            s.summary->>'model' as model,
            (s.summary->>'avgResponseTime')::float as response_time,
            (s.summary->>'avgQualityScore')::float as quality_score,
            (s.summary->>'avgCostPerQuery')::float as cost_per_query,
            CASE 
                WHEN priority = 'quality' THEN (s.summary->>'avgQualityScore')::float
                WHEN priority = 'speed' THEN 100 - ((s.summary->>'avgResponseTime')::float / 100)
                WHEN priority = 'cost' THEN 100 - ((s.summary->>'avgCostPerQuery')::float * 10000)
                ELSE -- balanced
                    ((s.summary->>'avgQualityScore')::float * 0.4) +
                    ((100 - ((s.summary->>'avgResponseTime')::float / 100)) * 0.3) +
                    ((100 - ((s.summary->>'avgCostPerQuery')::float * 10000)) * 0.3)
            END as score
        FROM latest_benchmark lb,
        LATERAL jsonb_array_elements(lb.summaries) s(summary)
    )
    SELECT 
        ms.provider::VARCHAR,
        ms.model::VARCHAR,
        ms.score
    FROM model_scores ms
    ORDER BY ms.score DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE qa_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_model_configs ENABLE ROW LEVEL SECURITY;

-- Políticas para admin
CREATE POLICY "Admins can manage benchmarks" ON qa_benchmarks
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage test cases" ON qa_test_cases
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage model configs" ON llm_model_configs
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Políticas para leitura pública
CREATE POLICY "Anyone can view benchmarks" ON qa_benchmarks
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view test cases" ON qa_test_cases
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view model configs" ON llm_model_configs
    FOR SELECT USING (true);