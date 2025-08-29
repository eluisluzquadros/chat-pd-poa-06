-- Adicionar a coluna difficulty na tabela qa_test_cases
ALTER TABLE qa_test_cases ADD COLUMN difficulty text;

-- Atualizar records existentes usando o campo complexity como difficulty
UPDATE qa_test_cases SET difficulty = complexity WHERE difficulty IS NULL;

-- Criar índice para otimizar buscas
CREATE INDEX idx_qa_test_cases_difficulty ON qa_test_cases(difficulty);