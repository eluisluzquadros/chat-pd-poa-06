-- FASE 4.2: Configurar Multi-LLM
-- Execute este script para habilitar fallback entre múltiplos LLMs

-- Verificar se a tabela llm_configs existe
CREATE TABLE IF NOT EXISTS llm_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    max_tokens INTEGER DEFAULT 4000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Limpar configurações antigas
DELETE FROM llm_configs;

-- Inserir configurações padrão com prioridade
INSERT INTO llm_configs (provider, model, priority, active, max_tokens, temperature) VALUES
-- Prioridade 1: OpenAI GPT-4
('openai', 'gpt-4-turbo-preview', 1, true, 4000, 0.7),
-- Prioridade 2: OpenAI GPT-3.5 (backup mais barato)
('openai', 'gpt-3.5-turbo', 2, true, 4000, 0.7),
-- Prioridade 3: Anthropic Claude (se configurado)
('anthropic', 'claude-3-opus', 3, false, 4000, 0.7),
-- Prioridade 4: Google Gemini (se configurado)
('google', 'gemini-pro', 4, false, 1000, 0.7);

-- Verificar configurações
SELECT 
    provider,
    model,
    priority,
    active,
    max_tokens,
    temperature
FROM llm_configs
ORDER BY priority;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_llm_configs_active_priority 
ON llm_configs(active, priority) 
WHERE active = true;