-- CORREÇÃO COMPLETA - ETAPA 1: LIMPAR DADOS ÓRFÃOS E CRIAR FOREIGN KEY
-- Primeiro vamos limpar os dados incorretos antes de criar a foreign key

-- 1. Identificar e remover registros órfãos
DELETE FROM qa_validation_results 
WHERE test_case_id IS NOT NULL 
AND test_case_id !~ '^[0-9]+$';

-- 2. Remover registros onde test_case_id não existe em qa_test_cases
DELETE FROM qa_validation_results 
WHERE test_case_id IS NOT NULL 
AND test_case_id ~ '^[0-9]+$'
AND test_case_id::INTEGER NOT IN (SELECT id FROM qa_test_cases);

-- 3. Agora alterar o tipo da coluna
ALTER TABLE qa_validation_results ALTER COLUMN test_case_id TYPE INTEGER USING 
CASE 
  WHEN test_case_id ~ '^[0-9]+$' THEN test_case_id::INTEGER 
  ELSE NULL 
END;

-- 4. Criar foreign key
ALTER TABLE qa_validation_results 
ADD CONSTRAINT fk_validation_results_test_case 
FOREIGN KEY (test_case_id) REFERENCES qa_test_cases(id) ON DELETE SET NULL;

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_validation_results_test_case_id 
ON qa_validation_results(test_case_id);

-- 6. Verificar resultado final
SELECT 
  'VERIFICAÇÃO FINAL' as status,
  COUNT(*) as total_results,
  COUNT(test_case_id) as with_valid_test_case_id,
  COUNT(*) - COUNT(test_case_id) as null_test_case_id
FROM qa_validation_results;