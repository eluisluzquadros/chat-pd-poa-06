-- Ativar agente Dify como padrão
BEGIN;

-- Remove default de todos os agentes
UPDATE dify_agents SET is_default = false WHERE is_default = true;

-- Define o agente Dify v2 como padrão
UPDATE dify_agents 
SET is_default = true, is_active = true 
WHERE name = 'agentic_openai_gpt_4.1-mini';

COMMIT;