-- Corrigir agente padrão: definir v3 como padrão e remover padrão do v2
UPDATE dify_agents 
SET is_default = false 
WHERE name = 'agentic_openai_gpt_4.1-mini';

UPDATE dify_agents 
SET is_default = true 
WHERE name = 'chatpdpoa-assistent-deepseek-chat';

-- Verificar resultado
SELECT name, display_name, is_default, is_active 
FROM dify_agents 
ORDER BY is_default DESC, name;