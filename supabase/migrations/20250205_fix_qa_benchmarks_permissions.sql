-- Fix qa_benchmarks permissions to allow authenticated users to save benchmark results
-- This migration updates RLS policies for better user access

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage benchmarks" ON qa_benchmarks;
DROP POLICY IF EXISTS "Anyone can view benchmarks" ON qa_benchmarks;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can view benchmarks" 
ON qa_benchmarks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create benchmarks" 
ON qa_benchmarks FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update own benchmarks" 
ON qa_benchmarks FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own benchmarks" 
ON qa_benchmarks FOR DELETE 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT ALL ON qa_benchmarks TO authenticated;

-- Create user_id column if it doesn't exist to track ownership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qa_benchmarks' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE qa_benchmarks 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
        
        -- Update existing records to set user_id
        UPDATE qa_benchmarks 
        SET user_id = auth.uid() 
        WHERE user_id IS NULL;
        
        -- Create index for better performance
        CREATE INDEX idx_qa_benchmarks_user_id ON qa_benchmarks(user_id);
    END IF;
END $$;

-- Update policies to use user_id for better security
DROP POLICY IF EXISTS "Authenticated users can update own benchmarks" ON qa_benchmarks;
DROP POLICY IF EXISTS "Authenticated users can delete own benchmarks" ON qa_benchmarks;

CREATE POLICY "Authenticated users can update own benchmarks" 
ON qa_benchmarks FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Authenticated users can delete own benchmarks" 
ON qa_benchmarks FOR DELETE 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add comment
COMMENT ON TABLE qa_benchmarks IS 'Stores benchmark results with user ownership for persistence';