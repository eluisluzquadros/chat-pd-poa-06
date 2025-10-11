-- Adicionar coluna agent_id para rastrear qual agente foi testado
ALTER TABLE security_validation_runs 
ADD COLUMN agent_id UUID REFERENCES dify_agents(id);

-- Criar índice para melhorar performance de queries
CREATE INDEX idx_security_validation_runs_agent_id ON security_validation_runs(agent_id);

-- Adicionar comentário explicativo
COMMENT ON COLUMN security_validation_runs.agent_id IS 'ID do agente Dify que foi testado nesta validação';