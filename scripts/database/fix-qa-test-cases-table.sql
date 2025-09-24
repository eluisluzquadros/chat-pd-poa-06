-- Script para corrigir a tabela qa_test_cases

-- 1. Primeiro, verificar se a tabela existe e quais colunas tem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'qa_test_cases' 
ORDER BY ordinal_position;

-- 2. Se a tabela existe mas sem a coluna test_id, adicionar a coluna
ALTER TABLE qa_test_cases 
ADD COLUMN IF NOT EXISTS test_id VARCHAR(100) UNIQUE;

-- 3. Se a tabela existe mas está com estrutura incorreta, recriar
-- Fazer backup dos dados existentes (se houver)
CREATE TABLE IF NOT EXISTS qa_test_cases_backup AS 
SELECT * FROM qa_test_cases;

-- Dropar a tabela antiga
DROP TABLE IF EXISTS qa_test_cases CASCADE;

-- Recriar com a estrutura correta
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

-- Inserir casos de teste padrão
INSERT INTO qa_test_cases (test_id, query, expected_keywords, category, complexity, min_response_length) VALUES
('greeting_simple', 'oi', ARRAY['olá', 'assistente', 'plano diretor'], 'greeting', 'simple', 50),
('zones_specific', 'Quais são as zonas do Centro Histórico?', ARRAY['ZOT', '08.1', 'Centro Histórico', 'zona'], 'zone_query', 'medium', 200),
('construction_height', 'Qual a altura máxima permitida no bairro Petrópolis?', ARRAY['altura', 'metros', 'Petrópolis', 'máxima'], 'construction_rules', 'medium', 150),
('list_comprehensive', 'Liste todos os bairros de Porto Alegre', ARRAY['bairros', 'Porto Alegre', 'lista'], 'comprehensive_list', 'high', 1000),
('conceptual_plano', 'O que é o Plano Diretor?', ARRAY['plano', 'diretor', 'desenvolvimento', 'urbano', 'município'], 'conceptual', 'medium', 300)
ON CONFLICT (test_id) DO NOTHING;

-- 4. Verificar se foi criada corretamente
SELECT * FROM qa_test_cases;

-- 5. Dropar backup se tudo estiver OK
-- DROP TABLE IF EXISTS qa_test_cases_backup;