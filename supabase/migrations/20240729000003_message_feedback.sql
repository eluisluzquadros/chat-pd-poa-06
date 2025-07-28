-- Create message feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  model TEXT,
  helpful BOOLEAN NOT NULL,
  comment TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_message_feedback_session_id ON message_feedback(session_id);
CREATE INDEX idx_message_feedback_helpful ON message_feedback(helpful);
CREATE INDEX idx_message_feedback_created_at ON message_feedback(created_at DESC);
CREATE INDEX idx_message_feedback_user_id ON message_feedback(user_id);

-- Create view for feedback statistics
CREATE OR REPLACE VIEW feedback_statistics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END) as negative_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as satisfaction_rate,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as comments_count
FROM message_feedback
GROUP BY DATE(created_at);

-- Create view for model performance
CREATE OR REPLACE VIEW model_feedback_stats AS
SELECT 
  model,
  COUNT(*) as total_feedback,
  SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as satisfaction_rate,
  COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as comments_count
FROM message_feedback
WHERE model IS NOT NULL
GROUP BY model;

-- RLS policies
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback" ON message_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback" ON message_feedback
  FOR SELECT USING (user_id = auth.uid());

-- Service role can read all feedback
CREATE POLICY "Service role can read all feedback" ON message_feedback
  FOR SELECT USING (auth.jwt()->>'role' = 'service_role');

-- Function to get feedback summary for a session
CREATE OR REPLACE FUNCTION get_session_feedback_summary(p_session_id TEXT)
RETURNS TABLE (
  total_messages INTEGER,
  messages_with_feedback INTEGER,
  positive_feedback INTEGER,
  negative_feedback INTEGER,
  satisfaction_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT message_id)::INTEGER as total_messages,
    COUNT(*)::INTEGER as messages_with_feedback,
    SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::INTEGER as positive_feedback,
    SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END)::INTEGER as negative_feedback,
    CASE 
      WHEN COUNT(*) > 0 
      THEN SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)
      ELSE 0
    END as satisfaction_rate
  FROM message_feedback
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality metrics when negative feedback is received
CREATE OR REPLACE FUNCTION handle_negative_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.helpful = false THEN
    -- Insert quality alert
    INSERT INTO quality_alerts (
      level,
      issues,
      metrics,
      created_at
    ) VALUES (
      'warning',
      ARRAY['Negative user feedback received'],
      jsonb_build_object(
        'message_id', NEW.message_id,
        'session_id', NEW.session_id,
        'comment', NEW.comment,
        'model', NEW.model
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER negative_feedback_alert
  AFTER INSERT ON message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION handle_negative_feedback();