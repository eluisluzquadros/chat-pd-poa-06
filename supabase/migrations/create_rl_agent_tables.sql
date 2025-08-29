-- Create tables for RL Cognitive Agent

-- Table to store cognitive distance analyses
CREATE TABLE IF NOT EXISTS cognitive_distance_analysis (
  id SERIAL PRIMARY KEY,
  test_case_id TEXT NOT NULL,
  model TEXT NOT NULL,
  analysis JSONB NOT NULL,
  accuracy FLOAT,
  response_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Index for faster queries
  INDEX idx_cognitive_model (model),
  INDEX idx_cognitive_created (created_at DESC)
);

-- Table to store learning patterns
CREATE TABLE IF NOT EXISTS rl_learning_patterns (
  id SERIAL PRIMARY KEY,
  patterns JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  total_analyses INTEGER,
  
  -- Index for faster queries
  INDEX idx_patterns_timestamp (timestamp DESC)
);

-- Table to store improvement recommendations
CREATE TABLE IF NOT EXISTS rl_improvement_recommendations (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  impact_estimate TEXT,
  implementation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  implemented_at TIMESTAMP WITH TIME ZONE,
  
  -- Index for faster queries
  INDEX idx_recommendations_category (category),
  INDEX idx_recommendations_status (implementation_status),
  INDEX idx_recommendations_priority (priority DESC)
);

-- Table to track system evolution
CREATE TABLE IF NOT EXISTS rl_system_evolution (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  avg_accuracy FLOAT,
  avg_response_time INTEGER,
  avg_cognitive_distance FLOAT,
  total_tests INTEGER,
  improvements_implemented INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate entries per day
  UNIQUE(metric_date),
  
  -- Index for faster queries
  INDEX idx_evolution_date (metric_date DESC)
);

-- Table to store feedback loops
CREATE TABLE IF NOT EXISTS rl_feedback_loops (
  id SERIAL PRIMARY KEY,
  source_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  feedback_content JSONB NOT NULL,
  impact_score FLOAT,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP WITH TIME ZONE,
  
  -- Index for faster queries
  INDEX idx_feedback_agents (source_agent, target_agent),
  INDEX idx_feedback_applied (applied),
  INDEX idx_feedback_created (created_at DESC)
);

-- Create a view for real-time learning metrics
CREATE OR REPLACE VIEW rl_learning_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_analyses,
  AVG((analysis->>'overallDistance')::FLOAT) as avg_cognitive_distance,
  AVG(accuracy) as avg_accuracy,
  AVG(response_time) as avg_response_time,
  COUNT(DISTINCT model) as models_tested,
  COUNT(DISTINCT test_case_id) as unique_test_cases
FROM cognitive_distance_analysis
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create a function to automatically track evolution
CREATE OR REPLACE FUNCTION track_daily_evolution()
RETURNS void AS $$
BEGIN
  INSERT INTO rl_system_evolution (
    metric_date,
    avg_accuracy,
    avg_response_time,
    avg_cognitive_distance,
    total_tests,
    improvements_implemented
  )
  SELECT 
    CURRENT_DATE,
    AVG(accuracy),
    AVG(response_time),
    AVG((analysis->>'overallDistance')::FLOAT),
    COUNT(*),
    (SELECT COUNT(*) FROM rl_improvement_recommendations 
     WHERE implementation_status = 'completed' 
     AND DATE(implemented_at) = CURRENT_DATE)
  FROM cognitive_distance_analysis
  WHERE DATE(created_at) = CURRENT_DATE
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    avg_accuracy = EXCLUDED.avg_accuracy,
    avg_response_time = EXCLUDED.avg_response_time,
    avg_cognitive_distance = EXCLUDED.avg_cognitive_distance,
    total_tests = EXCLUDED.total_tests,
    improvements_implemented = EXCLUDED.improvements_implemented;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update evolution metrics
CREATE OR REPLACE FUNCTION trigger_update_evolution()
RETURNS trigger AS $$
BEGIN
  PERFORM track_daily_evolution();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evolution_after_analysis
AFTER INSERT ON cognitive_distance_analysis
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_evolution();

-- Grant permissions
GRANT ALL ON cognitive_distance_analysis TO authenticated;
GRANT ALL ON rl_learning_patterns TO authenticated;
GRANT ALL ON rl_improvement_recommendations TO authenticated;
GRANT ALL ON rl_system_evolution TO authenticated;
GRANT ALL ON rl_feedback_loops TO authenticated;
GRANT SELECT ON rl_learning_metrics TO authenticated;