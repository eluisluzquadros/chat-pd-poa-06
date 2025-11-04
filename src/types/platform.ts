export interface PlatformAnnouncement {
  id: string;
  type: 'feature' | 'update' | 'maintenance' | 'improvement' | 'integration';
  title: string;
  description: string;
  content?: string;
  image_url?: string;
  category?: string;
  priority: number;
  published_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  is_new?: boolean; // Computado no frontend
}

export interface PlatformStatusEvent {
  id: string;
  service_name: string;
  event_type: 'outage' | 'degradation' | 'maintenance' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affected_users: number;
  started_at: string;
  resolved_at?: string;
  duration_minutes?: number;
  updates: StatusUpdate[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StatusUpdate {
  timestamp: string;
  status: string;
  message: string;
  author?: string;
}

export interface ServiceMetrics {
  service_name: string;
  date: string;
  uptime_percentage: number;
  total_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  incidents_count: number;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime_90d: number[];
  current_incidents: PlatformStatusEvent[];
}
