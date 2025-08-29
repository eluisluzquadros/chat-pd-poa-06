-- Adicionar coluna keywords à tabela qa_test_cases
ALTER TABLE qa_test_cases 
ADD COLUMN IF NOT EXISTS keywords text[];

-- Comentário na coluna
COMMENT ON COLUMN qa_test_cases.keywords IS 'Palavras-chave esperadas na resposta para avaliar precisão';

-- Verificar estrutura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'qa_test_cases'
ORDER BY ordinal_position;