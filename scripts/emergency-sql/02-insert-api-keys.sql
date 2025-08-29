-- FASE 1.2: Inserir API Keys
-- Execute este script APÓS criar a tabela secrets
-- IMPORTANTE: Substitua a chave abaixo com a chave real do arquivo .env.local

-- Inserir OpenAI API Key
INSERT INTO secrets (name, value) VALUES
('OPENAI_API_KEY', 'YOUR_OPENAI_API_KEY_HERE')
ON CONFLICT (name) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- Se você tiver outras chaves, adicione aqui:
 INSERT INTO secrets (name, value) VALUES
 ('ANTHROPIC_API_KEY', 'YOUR_ANTHROPIC_API_KEY_HERE'),
 ('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')
 ('DEEPSEEK_API_KEY', 'YOUR_DEEPSEEK_API_KEY_HERE'),
 ('ZHIPUAI_API_KEY', 'YOUR_ZHIPUAI_API_KEY_HERE')
 ON CONFLICT (name) DO UPDATE SET 
     value = EXCLUDED.value,
     updated_at = CURRENT_TIMESTAMP;