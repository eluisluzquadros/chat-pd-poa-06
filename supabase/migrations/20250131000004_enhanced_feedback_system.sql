-- Enhanced Feedback System Migration
-- This migration extends the existing message_feedback table and adds new tables for comprehensive feedback analytics

-- Create feedback_alerts table for tracking negative feedback patterns
CREATE TABLE IF NOT EXISTS public.feedback_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    session_id UUID NOT NULL,
    model TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('negative_feedback', 'low_rating', 'spam_detection')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    comment TEXT,
    feedback_id UUID REFERENCES public.message_feedback(id),
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create session_quality_metrics table for tracking session-level satisfaction
CREATE TABLE IF NOT EXISTS public.session_quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE,
    total_feedback INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    satisfaction_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2),
    first_feedback_at TIMESTAMP WITH TIME ZONE,
    last_feedback_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create model_performance_metrics table for tracking model-specific performance
CREATE TABLE IF NOT EXISTS public.model_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model TEXT NOT NULL,
    date DATE NOT NULL,
    total_feedback INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    satisfaction_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2),
    response_time_avg INTEGER, -- in milliseconds
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(model, date)
);

-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add metadata column to existing message_feedback if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_feedback' AND column_name='metadata') THEN
        ALTER TABLE public.message_feedback ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add user_id column to message_feedback if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_feedback' AND column_name='user_id') THEN
        ALTER TABLE public.message_feedback ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_alerts_session_id ON public.feedback_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_alerts_model ON public.feedback_alerts(model);
CREATE INDEX IF NOT EXISTS idx_feedback_alerts_severity ON public.feedback_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_feedback_alerts_resolved ON public.feedback_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_feedback_alerts_created_at ON public.feedback_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_session_quality_session_id ON public.session_quality_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_quality_satisfaction ON public.session_quality_metrics(satisfaction_rate);

CREATE INDEX IF NOT EXISTS idx_model_performance_model ON public.model_performance_metrics(model);
CREATE INDEX IF NOT EXISTS idx_model_performance_date ON public.model_performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_model_performance_satisfaction ON public.model_performance_metrics(satisfaction_rate);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id ON public.message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_model ON public.message_feedback(model);
CREATE INDEX IF NOT EXISTS idx_message_feedback_helpful ON public.message_feedback(helpful);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON public.message_feedback(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.feedback_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Feedback alerts - only admins can see all, users can see their own
CREATE POLICY "feedback_alerts_admin_access" ON public.feedback_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Session quality metrics - only admins can access
CREATE POLICY "session_quality_admin_access" ON public.session_quality_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Model performance metrics - only admins can access
CREATE POLICY "model_performance_admin_access" ON public.model_performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Notifications - users can only see their own
CREATE POLICY "notifications_user_access" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

-- Create functions for automatic metric updates
CREATE OR REPLACE FUNCTION update_session_quality_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session quality metrics when feedback is added/updated
    INSERT INTO public.session_quality_metrics (
        session_id,
        total_feedback,
        helpful_count,
        unhelpful_count,
        satisfaction_rate,
        first_feedback_at,
        last_feedback_at,
        updated_at
    )
    SELECT 
        NEW.session_id,
        COUNT(*),
        SUM(CASE WHEN helpful THEN 1 ELSE 0 END),
        SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END),
        (SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
        MIN(created_at),
        MAX(created_at),
        NOW()
    FROM public.message_feedback 
    WHERE session_id = NEW.session_id
    ON CONFLICT (session_id) DO UPDATE SET
        total_feedback = EXCLUDED.total_feedback,
        helpful_count = EXCLUDED.helpful_count,
        unhelpful_count = EXCLUDED.unhelpful_count,
        satisfaction_rate = EXCLUDED.satisfaction_rate,
        last_feedback_at = EXCLUDED.last_feedback_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session quality metrics
DROP TRIGGER IF EXISTS trigger_update_session_quality ON public.message_feedback;
CREATE TRIGGER trigger_update_session_quality
    AFTER INSERT OR UPDATE ON public.message_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_session_quality_metrics();

-- Create function to update model performance metrics
CREATE OR REPLACE FUNCTION update_model_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily model performance metrics
    INSERT INTO public.model_performance_metrics (
        model,
        date,
        total_feedback,
        helpful_count,
        unhelpful_count,
        satisfaction_rate,
        comment_count,
        updated_at
    )
    SELECT 
        NEW.model,
        CURRENT_DATE,
        COUNT(*),
        SUM(CASE WHEN helpful THEN 1 ELSE 0 END),
        SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END),
        (SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
        SUM(CASE WHEN comment IS NOT NULL AND LENGTH(TRIM(comment)) > 0 THEN 1 ELSE 0 END),
        NOW()
    FROM public.message_feedback 
    WHERE model = NEW.model 
    AND DATE(created_at) = CURRENT_DATE
    ON CONFLICT (model, date) DO UPDATE SET
        total_feedback = EXCLUDED.total_feedback,
        helpful_count = EXCLUDED.helpful_count,
        unhelpful_count = EXCLUDED.unhelpful_count,
        satisfaction_rate = EXCLUDED.satisfaction_rate,
        comment_count = EXCLUDED.comment_count,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for model performance metrics
DROP TRIGGER IF EXISTS trigger_update_model_performance ON public.message_feedback;
CREATE TRIGGER trigger_update_model_performance
    AFTER INSERT OR UPDATE ON public.message_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_model_performance_metrics();

-- Create function to check for feedback alerts
CREATE OR REPLACE FUNCTION check_feedback_alerts()
RETURNS TRIGGER AS $$
DECLARE
    recent_negative_count INTEGER;
    alert_severity TEXT := 'low';
    alert_type TEXT := 'negative_feedback';
BEGIN
    -- Only process negative feedback
    IF NEW.helpful = FALSE THEN
        -- Count recent negative feedback in this session
        SELECT COUNT(*) INTO recent_negative_count
        FROM public.message_feedback
        WHERE session_id = NEW.session_id
        AND helpful = FALSE
        AND created_at >= NOW() - INTERVAL '1 hour';
        
        -- Determine severity based on patterns
        IF recent_negative_count >= 3 THEN
            alert_severity := 'high';
            alert_type := 'low_rating';
        ELSIF recent_negative_count >= 2 THEN
            alert_severity := 'medium';
        END IF;
        
        -- Check for potential spam
        IF NEW.comment IS NOT NULL AND (
            LENGTH(NEW.comment) < 5 OR
            NEW.comment ILIKE '%spam%' OR
            NEW.comment ILIKE '%test%' OR
            NEW.comment ~ '^[a-zA-Z0-9]{1,5}$'
        ) THEN
            alert_type := 'spam_detection';
            alert_severity := 'low';
        END IF;
        
        -- Create alert
        INSERT INTO public.feedback_alerts (
            message_id,
            session_id,
            model,
            alert_type,
            severity,
            comment,
            feedback_id,
            resolved,
            metadata
        ) VALUES (
            NEW.message_id,
            NEW.session_id,
            NEW.model,
            alert_type,
            alert_severity,
            NEW.comment,
            NEW.id,
            FALSE,
            jsonb_build_object(
                'session_negative_count', recent_negative_count,
                'user_id', NEW.user_id,
                'auto_generated', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feedback alerts
DROP TRIGGER IF EXISTS trigger_check_feedback_alerts ON public.message_feedback;
CREATE TRIGGER trigger_check_feedback_alerts
    AFTER INSERT ON public.message_feedback
    FOR EACH ROW
    EXECUTE FUNCTION check_feedback_alerts();

-- Create view for dashboard summary
CREATE OR REPLACE VIEW public.feedback_dashboard_summary AS
SELECT 
    -- Overall metrics
    COUNT(*) as total_feedback,
    SUM(CASE WHEN helpful THEN 1 ELSE 0 END) as helpful_count,
    SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END) as unhelpful_count,
    ROUND((SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2) as helpful_percentage,
    SUM(CASE WHEN comment IS NOT NULL AND LENGTH(TRIM(comment)) > 0 THEN 1 ELSE 0 END) as comment_count,
    
    -- Time-based metrics
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_feedback,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_feedback,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_feedback,
    
    -- Model distribution
    COUNT(DISTINCT model) as unique_models,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users
FROM public.message_feedback;

-- Grant permissions
GRANT ALL ON public.feedback_alerts TO authenticated;
GRANT ALL ON public.session_quality_metrics TO authenticated;
GRANT ALL ON public.model_performance_metrics TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT SELECT ON public.feedback_dashboard_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.feedback_alerts IS 'Stores alerts generated from negative feedback patterns';
COMMENT ON TABLE public.session_quality_metrics IS 'Tracks quality metrics per chat session';
COMMENT ON TABLE public.model_performance_metrics IS 'Daily performance metrics per AI model';
COMMENT ON TABLE public.notifications IS 'System notifications for users and admins';
COMMENT ON VIEW public.feedback_dashboard_summary IS 'Dashboard summary view for feedback analytics';