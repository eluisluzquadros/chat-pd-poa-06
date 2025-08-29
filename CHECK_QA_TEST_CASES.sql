-- Verificar casos de teste QA ativos
SELECT 
    COUNT(*) as total_cases,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_cases,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_cases
FROM qa_test_cases;

-- Listar todos os casos ativos
SELECT id, question, is_active, category, difficulty
FROM qa_test_cases
WHERE is_active = true
ORDER BY created_at ASC;

-- Verificar se há duplicatas ou problemas
SELECT is_active, COUNT(*) as count
FROM qa_test_cases
GROUP BY is_active;