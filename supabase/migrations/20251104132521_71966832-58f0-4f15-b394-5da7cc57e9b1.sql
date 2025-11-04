-- Limpar duplicatas mantendo o registro mais recente
DELETE FROM platform_announcements a
USING platform_announcements b
WHERE a.id < b.id
  AND a.title = b.title
  AND a.published_at = b.published_at;

-- Adicionar constraint UNIQUE para evitar duplicatas futuras
ALTER TABLE platform_announcements 
ADD CONSTRAINT unique_announcement_title_published UNIQUE (title, published_at);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON platform_announcements(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON platform_announcements(type, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_events_service ON platform_status_events(service_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_events_status ON platform_status_events(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_metrics_lookup ON platform_service_metrics(service_name, date DESC);