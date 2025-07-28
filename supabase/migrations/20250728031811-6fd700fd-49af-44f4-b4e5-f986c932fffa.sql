-- Add versioning and SQL-specific fields to qa_test_cases
ALTER TABLE qa_test_cases 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_sql_related BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expected_sql TEXT,
ADD COLUMN IF NOT EXISTS sql_complexity TEXT CHECK (sql_complexity IN ('low', 'medium', 'high'));

-- Create test case history table for versioning
CREATE TABLE IF NOT EXISTS qa_test_case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES qa_test_cases(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  expected_sql TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_sql_related BOOLEAN DEFAULT FALSE,
  sql_complexity TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT
);

-- Add SQL validation metrics to qa_validation_results
ALTER TABLE qa_validation_results 
ADD COLUMN IF NOT EXISTS sql_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sql_syntax_valid BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sql_result_match BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS generated_sql TEXT;

-- Create learning insights table
CREATE TABLE IF NOT EXISTS qa_learning_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'pattern', 'improvement', 'failure'
  insight_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_applied BOOLEAN DEFAULT FALSE
);

-- Create validation execution preferences table
CREATE TABLE IF NOT EXISTS qa_validation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  default_execution_mode TEXT DEFAULT 'all', -- 'all', 'random', 'selected', 'category'
  default_batch_size INTEGER DEFAULT 10,
  preferred_categories TEXT[] DEFAULT '{}',
  auto_generate_insights BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE qa_test_case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qa_test_case_history
CREATE POLICY "Supervisors can view test case history" 
ON qa_test_case_history FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "Supervisors can manage test case history" 
ON qa_test_case_history FOR ALL 
USING (is_supervisor_or_admin());

-- RLS Policies for qa_learning_insights  
CREATE POLICY "Supervisors can view learning insights" 
ON qa_learning_insights FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "Admins can manage learning insights" 
ON qa_learning_insights FOR ALL 
USING (is_admin());

-- RLS Policies for qa_validation_preferences
CREATE POLICY "Users can view their own preferences" 
ON qa_validation_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" 
ON qa_validation_preferences FOR ALL 
USING (auth.uid() = user_id);

-- Create function to track test case changes
CREATE OR REPLACE FUNCTION track_test_case_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into history table when test case is updated
  IF TG_OP = 'UPDATE' AND (
    OLD.question != NEW.question OR 
    OLD.expected_answer != NEW.expected_answer OR
    OLD.expected_sql != NEW.expected_sql OR
    OLD.category != NEW.category OR
    OLD.difficulty != NEW.difficulty OR
    OLD.tags != NEW.tags OR
    OLD.is_sql_related != NEW.is_sql_related OR
    OLD.sql_complexity != NEW.sql_complexity
  ) THEN
    -- Increment version
    NEW.version = OLD.version + 1;
    
    -- Insert into history
    INSERT INTO qa_test_case_history (
      test_case_id, version, question, expected_answer, expected_sql,
      category, difficulty, tags, is_sql_related, sql_complexity,
      changed_by, change_reason
    ) VALUES (
      NEW.id, OLD.version, OLD.question, OLD.expected_answer, OLD.expected_sql,
      OLD.category, OLD.difficulty, OLD.tags, OLD.is_sql_related, OLD.sql_complexity,
      auth.uid(), 'Updated via dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for test case versioning
DROP TRIGGER IF EXISTS test_case_versioning_trigger ON qa_test_cases;
CREATE TRIGGER test_case_versioning_trigger
  BEFORE UPDATE ON qa_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION track_test_case_changes();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_test_case_history_test_case_id ON qa_test_case_history(test_case_id);
CREATE INDEX IF NOT EXISTS idx_qa_learning_insights_model_category ON qa_learning_insights(model, category);
CREATE INDEX IF NOT EXISTS idx_qa_validation_results_test_case_model ON qa_validation_results(test_case_id, model);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_sql_related ON qa_test_cases(is_sql_related) WHERE is_sql_related = true;