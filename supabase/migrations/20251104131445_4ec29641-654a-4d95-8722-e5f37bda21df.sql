-- ====================================
-- PLATFORM STATUS AND ANNOUNCEMENTS SYSTEM
-- ====================================

-- Table: platform_announcements
CREATE TABLE IF NOT EXISTS public.platform_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('feature', 'update', 'maintenance', 'improvement', 'integration')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    category TEXT,
    priority INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: platform_status_events
CREATE TABLE IF NOT EXISTS public.platform_status_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('outage', 'degradation', 'maintenance', 'resolved')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    affected_users INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    updates JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_announcement_views
CREATE TABLE IF NOT EXISTS public.user_announcement_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    announcement_id UUID NOT NULL REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, announcement_id)
);

-- Table: platform_service_metrics
CREATE TABLE IF NOT EXISTS public.platform_service_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL,
    date DATE NOT NULL,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    total_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    incidents_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_name, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.platform_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.platform_announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.platform_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.platform_announcements(category);

CREATE INDEX IF NOT EXISTS idx_status_events_service ON public.platform_status_events(service_name);
CREATE INDEX IF NOT EXISTS idx_status_events_severity ON public.platform_status_events(severity);
CREATE INDEX IF NOT EXISTS idx_status_events_started ON public.platform_status_events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_events_status ON public.platform_status_events(status);

CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON public.user_announcement_views(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON public.user_announcement_views(announcement_id);

CREATE INDEX IF NOT EXISTS idx_service_metrics_service ON public.platform_service_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_service_metrics_date ON public.platform_service_metrics(date DESC);

-- Enable Row Level Security
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_service_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Announcements: Public can read active/published, admins can manage all
DROP POLICY IF EXISTS "announcements_public_read" ON public.platform_announcements;
CREATE POLICY "announcements_public_read" ON public.platform_announcements
    FOR SELECT USING (
        is_active = true 
        AND published_at <= NOW()
        AND (expires_at IS NULL OR expires_at > NOW())
    );

DROP POLICY IF EXISTS "announcements_admin_all" ON public.platform_announcements;
CREATE POLICY "announcements_admin_all" ON public.platform_announcements
    FOR ALL USING (is_admin());

-- Status Events: Public read, admins write
DROP POLICY IF EXISTS "status_events_public_read" ON public.platform_status_events;
CREATE POLICY "status_events_public_read" ON public.platform_status_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "status_events_admin_write" ON public.platform_status_events;
CREATE POLICY "status_events_admin_write" ON public.platform_status_events
    FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "status_events_admin_update" ON public.platform_status_events;
CREATE POLICY "status_events_admin_update" ON public.platform_status_events
    FOR UPDATE USING (is_admin());

-- User views: Users can only access their own
DROP POLICY IF EXISTS "user_views_own_access" ON public.user_announcement_views;
CREATE POLICY "user_views_own_access" ON public.user_announcement_views
    FOR ALL USING (user_id = auth.uid());

-- Service Metrics: Public read
DROP POLICY IF EXISTS "service_metrics_public_read" ON public.platform_service_metrics;
CREATE POLICY "service_metrics_public_read" ON public.platform_service_metrics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_metrics_admin_write" ON public.platform_service_metrics;
CREATE POLICY "service_metrics_admin_write" ON public.platform_service_metrics
    FOR ALL USING (is_admin());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_platform_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.platform_announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.platform_announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_platform_updated_at();

DROP TRIGGER IF EXISTS update_status_events_updated_at ON public.platform_status_events;
CREATE TRIGGER update_status_events_updated_at
    BEFORE UPDATE ON public.platform_status_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_platform_updated_at();

-- Function to calculate incident duration
CREATE OR REPLACE FUNCTION public.calculate_incident_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.resolved_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.started_at)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_status_event_duration ON public.platform_status_events;
CREATE TRIGGER calculate_status_event_duration
    BEFORE INSERT OR UPDATE ON public.platform_status_events
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_incident_duration();

-- Insert sample data for demonstration
INSERT INTO public.platform_announcements (type, title, description, content, category, priority, published_at, is_active)
VALUES 
    ('feature', 'Novo Sistema de Notificações', 'Acompanhe atualizações da plataforma em tempo real', E'## Novo Sistema de Notificações\n\nAgora você pode acompanhar todas as novidades e atualizações da plataforma em um único lugar!\n\n### Recursos:\n- 🔔 Notificações em tempo real\n- 📊 Status de sistemas e serviços\n- 🎯 Alertas personalizados\n- 📝 Histórico completo de incidentes', 'ui', 10, NOW(), true),
    ('update', 'Melhorias na Interface do Chat', 'Performance aprimorada e novos recursos visuais', E'## Melhorias no Chat\n\nImplementamos diversas melhorias de performance e usabilidade no sistema de chat.', 'ai', 5, NOW() - INTERVAL '2 days', true),
    ('integration', 'Nova Integração com Dify', 'Conecte seus agentes Dify diretamente na plataforma', E'## Integração Dify\n\nAgora você pode integrar seus agentes Dify de forma nativa!', 'integration', 8, NOW() - INTERVAL '5 days', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_service_metrics (service_name, date, uptime_percentage, total_requests, failed_requests, avg_response_time_ms)
SELECT 
    service,
    CURRENT_DATE - (INTERVAL '1 day' * generate_series(0, 89)),
    CASE 
        WHEN random() > 0.98 THEN 95.0 + (random() * 4.9)
        ELSE 99.0 + (random() * 0.99)
    END,
    (1000 + random() * 9000)::INTEGER,
    (0 + random() * 50)::INTEGER,
    (50 + random() * 150)::INTEGER
FROM unnest(ARRAY['Lovable AI', 'Cloud Database', 'Edge Functions', 'Storage', 'Authentication']) AS service
ON CONFLICT DO NOTHING;