-- CORREÇÃO COMPLETA: FOREIGN KEY ENTRE qa_validation_results E qa_test_cases
-- Problema: test_case_id é TEXT mas qa_test_cases.id é INTEGER
-- Solução: Alterar test_case_id para INTEGER e criar foreign key

-- 1. Criar coluna temporária com tipo correto
ALTER TABLE qa_validation_results ADD COLUMN test_case_id_temp INTEGER;

-- 2. Migrar dados existentes - converter test_case_id de text para integer quando possível
UPDATE qa_validation_results 
SET test_case_id_temp = CASE 
  WHEN test_case_id ~ '^[0-9]+$' THEN test_case_id::INTEGER 
  ELSE NULL 
END;

-- 3. Remover coluna antiga
ALTER TABLE qa_validation_results DROP COLUMN test_case_id;

-- 4. Renomear coluna temporária
ALTER TABLE qa_validation_results RENAME COLUMN test_case_id_temp TO test_case_id;

-- 5. Criar foreign key
ALTER TABLE qa_validation_results 
ADD CONSTRAINT fk_validation_results_test_case 
FOREIGN KEY (test_case_id) REFERENCES qa_test_cases(id) ON DELETE SET NULL;

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_validation_results_test_case_id 
ON qa_validation_results(test_case_id);

-- 7. Verificar resultado
SELECT 
  'VERIFICAÇÃO FOREIGN KEY' as status,
  COUNT(*) as total_results,
  COUNT(test_case_id) as with_test_case_id,
  COUNT(*) - COUNT(test_case_id) as orphaned_results
FROM qa_validation_results;