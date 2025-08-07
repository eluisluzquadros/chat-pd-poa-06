-- Fix qa_validation_results.test_case_id column type from UUID to TEXT
-- This allows storing both numeric IDs and string IDs from different test case sources

ALTER TABLE qa_validation_results 
ALTER COLUMN test_case_id TYPE TEXT;