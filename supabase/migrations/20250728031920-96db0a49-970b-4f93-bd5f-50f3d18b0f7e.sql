-- Fix the search_path security issue - drop trigger first then function
DROP TRIGGER IF EXISTS test_case_versioning_trigger ON qa_test_cases;
DROP FUNCTION IF EXISTS track_test_case_changes();

CREATE OR REPLACE FUNCTION track_test_case_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into history table when test case is updated
  IF TG_OP = 'UPDATE' AND (
    OLD.question != NEW.question OR 
    OLD.expected_answer != NEW.expected_answer OR
    OLD.expected_sql IS DISTINCT FROM NEW.expected_sql OR
    OLD.category != NEW.category OR
    OLD.difficulty != NEW.difficulty OR
    OLD.tags != NEW.tags OR
    OLD.is_sql_related != NEW.is_sql_related OR
    OLD.sql_complexity IS DISTINCT FROM NEW.sql_complexity
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'auth';

-- Recreate the trigger
CREATE TRIGGER test_case_versioning_trigger
  BEFORE UPDATE ON qa_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION track_test_case_changes();