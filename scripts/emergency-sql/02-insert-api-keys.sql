-- FASE 1.2: Inserir API Keys
-- Execute este script APÓS criar a tabela secrets
-- IMPORTANTE: Substitua a chave abaixo com a chave real do arquivo .env.local

-- Inserir OpenAI API Key
INSERT INTO secrets (name, value) VALUES
('OPENAI_API_KEY', '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')
ON CONFLICT (name) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- Se você tiver outras chaves, adicione aqui:
 INSERT INTO secrets (name, value) VALUES
 ('ANTHROPIC_API_KEY', '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'),
 ('GEMINI_API_KEY', 'AIzaSyCN1bC1e-uVBt8EjUvVEHLtGgCobXoUmZo')
 ('DEEPSEEK_API_KEY', 'sk-1db103e612104b119547d1130cc6c06d'),
 ('ZHIPUAI_API_KEY', '99e0d72dacc94db18ab1bb56d5b1b2aa.AGKfhwZQVe7Ki8IO')
 ON CONFLICT (name) DO UPDATE SET 
     value = EXCLUDED.value,
     updated_at = CURRENT_TIMESTAMP;