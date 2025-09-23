-- LIMPEZA CRÍTICA: Finalizar execuções órfãs travadas
-- Marcar como 'failed' todas as execuções em 'running' há mais de 1 hora

UPDATE qa_validation_runs 
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Execução órfã finalizada automaticamente - Sistema estava travado'
WHERE 
  status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';

-- Verificar resultado da limpeza
SELECT 
  'LIMPEZA CONCLUÍDA' as status,
  COUNT(*) as execucoes_limpas
FROM qa_validation_runs 
WHERE 
  status = 'failed' 
  AND error_message LIKE '%Execução órfã%';

-- Criar função de limpeza automática para prevenir problemas futuros
CREATE OR REPLACE FUNCTION cleanup_stuck_qa_runs()
RETURNS INTEGER 
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  UPDATE qa_validation_runs 
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = 'Timeout automático - Execução cancelada após 2 horas'
  WHERE 
    status = 'running' 
    AND started_at < NOW() - INTERVAL '2 hours';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$;

-- Função para validar modelos aceitos
CREATE OR REPLACE FUNCTION validate_qa_model(model_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lista de modelos válidos (LLMs reais)
  RETURN model_name IN (
    'anthropic/claude-3-5-sonnet-20241022',
    'anthropic/claude-3-5-haiku-20241022', 
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-3.5-turbo',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'meta-llama/llama-3.1-405b-instruct',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'mistralai/mistral-7b-instruct',
    'mistralai/mixtral-8x7b-instruct'
  );
END;
$$;