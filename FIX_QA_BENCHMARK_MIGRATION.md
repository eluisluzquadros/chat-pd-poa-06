# 🔧 Corrigir Migração do Sistema de Benchmark QA

## ❌ Erro Encontrado

```
ERROR: 42703: column "test_id" of relation "qa_test_cases" does not exist
```

## 🎯 Solução Rápida

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- 1. Dropar tabela existente (se houver)
DROP TABLE IF EXISTS qa_test_cases CASCADE;

-- 2. Criar tabela com estrutura correta
CREATE TABLE qa_test_cases (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(100) UNIQUE NOT NULL,
    query TEXT NOT NULL,
    expected_keywords TEXT[] NOT NULL,
    category VARCHAR(50) NOT NULL,
    complexity VARCHAR(20) NOT NULL CHECK (complexity IN ('simple', 'medium', 'high')),
    min_response_length INTEGER,
    expected_response TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir casos de teste padrão
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length) VALUES
('greeting_simple', 'oi', ARRAY['olá', 'assistente', 'plano diretor'], 'greeting', 'simple', 50),
('zones_specific', 'Quais são as zonas do Centro Histórico?', ARRAY['ZOT', '08.1', 'Centro Histórico', 'zona'], 'zone_query', 'medium', 200),
('construction_height', 'Qual a altura máxima permitida no bairro Petrópolis?', ARRAY['altura', 'metros', 'Petrópolis', 'máxima'], 'construction_rules', 'medium', 150),
('list_comprehensive', 'Liste todos os bairros de Porto Alegre', ARRAY['bairros', 'Porto Alegre', 'lista'], 'comprehensive_list', 'high', 1000),
('conceptual_plano', 'O que é o Plano Diretor?', ARRAY['plano', 'diretor', 'desenvolvimento', 'urbano', 'município'], 'conceptual', 'medium', 300);

-- 4. Verificar criação
SELECT * FROM qa_test_cases;
```

## 📋 Depois Execute o Resto da Migração

Continue com as outras tabelas da migração:

```sql
-- Criar tabela qa_benchmarks
CREATE TABLE IF NOT EXISTS qa_benchmarks (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    results JSONB NOT NULL,
    summaries JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_qa_benchmarks_timestamp ON qa_benchmarks(timestamp DESC);
CREATE INDEX idx_qa_benchmarks_metadata ON qa_benchmarks USING GIN (metadata);

-- Criar tabela llm_model_configs
CREATE TABLE IF NOT EXISTS llm_model_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    cost_per_input_token DECIMAL(10, 8) NOT NULL,
    cost_per_output_token DECIMAL(10, 8) NOT NULL,
    max_tokens INTEGER NOT NULL,
    average_latency INTEGER,
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, model)
);

-- Inserir configurações de modelos
INSERT INTO llm_model_configs (provider, model, cost_per_input_token, cost_per_output_token, max_tokens, average_latency) VALUES
('openai', 'gpt-3.5-turbo', 0.0000015, 0.000002, 4096, 1500),
('openai', 'gpt-3.5-turbo-16k', 0.000003, 0.000004, 16384, 2000),
('openai', 'gpt-4', 0.00003, 0.00006, 8192, 5000),
('openai', 'gpt-4-turbo-preview', 0.00001, 0.00003, 128000, 4000),
('anthropic', 'claude-3-haiku-20240307', 0.00000025, 0.00000125, 4096, 1000),
('anthropic', 'claude-3-sonnet-20240229', 0.000003, 0.000015, 4096, 2500),
('anthropic', 'claude-3-opus-20240229', 0.000015, 0.000075, 4096, 4000),
('google', 'gemini-pro', 0.00000025, 0.00000125, 30720, 2000),
('deepseek', 'deepseek-chat', 0.0000001, 0.0000002, 4096, 1500),
('zhipuai', 'glm-4', 0.0000001, 0.0000002, 8192, 2000)
ON CONFLICT (provider, model) DO UPDATE SET
    cost_per_input_token = EXCLUDED.cost_per_input_token,
    cost_per_output_token = EXCLUDED.cost_per_output_token,
    updated_at = NOW();
```

## ✅ Verificação Final

```sql
-- Verificar todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('qa_benchmarks', 'qa_test_cases', 'llm_model_configs');

-- Verificar dados
SELECT COUNT(*) as test_cases FROM qa_test_cases;
SELECT COUNT(*) as model_configs FROM llm_model_configs;
```

## 🎉 Resultado Esperado

- ✅ 3 tabelas criadas
- ✅ 5 casos de teste inseridos
- ✅ 10 modelos LLM configurados
- ✅ Sistema pronto para benchmark!

## 🚀 Próximo Passo

Acesse o dashboard em: http://localhost:5173/admin/benchmark