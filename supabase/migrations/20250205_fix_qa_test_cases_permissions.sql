-- Fix qa_test_cases table structure and permissions
-- This migration ensures the qa_test_cases table has the correct structure and RLS policies

-- First, ensure the table has all required columns
ALTER TABLE qa_test_cases 
ADD COLUMN IF NOT EXISTS query TEXT,
ADD COLUMN IF NOT EXISTS question TEXT,
ADD COLUMN IF NOT EXISTS expected_answer TEXT,
ADD COLUMN IF NOT EXISTS expected_sql TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_sql_related BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sql_complexity TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Update query column from question if query is empty
UPDATE qa_test_cases 
SET query = question 
WHERE query IS NULL AND question IS NOT NULL;

-- Enable RLS
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON qa_test_cases;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON qa_test_cases;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON qa_test_cases;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON qa_test_cases;

-- Create policies that allow full CRUD operations for authenticated users
CREATE POLICY "Enable read access for all authenticated users" 
ON qa_test_cases FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON qa_test_cases FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON qa_test_cases FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
ON qa_test_cases FOR DELETE 
TO authenticated 
USING (true);

-- Also allow anon users to read (for public API access)
CREATE POLICY "Enable read access for anon users" 
ON qa_test_cases FOR SELECT 
TO anon 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_category ON qa_test_cases(category);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_is_active ON qa_test_cases(is_active);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_test_id ON qa_test_cases(test_id);

-- Grant necessary permissions
GRANT ALL ON qa_test_cases TO authenticated;
GRANT SELECT ON qa_test_cases TO anon;