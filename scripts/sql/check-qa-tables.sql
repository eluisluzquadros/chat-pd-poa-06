-- Check qa_test_cases structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'qa_test_cases'
AND column_name IN ('id', 'test_id')
ORDER BY ordinal_position;

-- Sample test case data
SELECT id, test_id 
FROM qa_test_cases 
LIMIT 3;

-- Check qa_validation_results structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'qa_validation_results'
AND column_name = 'test_case_id'
ORDER BY ordinal_position;