export type ServiceType = 'technical' | 'business';

export interface ServiceConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  type: ServiceType;
  route?: string;
}

export interface PlatformAnnouncement {
  id: string;
  type: 'feature' | 'update' | 'maintenance' | 'improvement' | 'integration';
  title: string;
  description: string;
  content?: string;
  image_url?: string;
  category: string;
  priority: number;
  published_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  is_new?: boolean; // Computed on frontend
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

// Serviços de Negócio (Usuário Final)
export const BUSINESS_SERVICES: ServiceConfig[] = [
  {
    name: 'Chat Agent',
    displayName: 'Agente IA',
    description: 'Converse com o assistente sobre o Plano Diretor',
    icon: 'MessageSquare',
    type: 'business',
    route: '/chat'
  },
  {
    name: 'Data Explorer',
    displayName: 'Painel de Dados',
    description: 'Explore informações e dados do Plano Diretor',
    icon: 'BarChart3',
    type: 'business',
    route: '/explorar-dados'
  },
  {
    name: 'User Registration',
    displayName: 'Cadastro',
    description: 'Cadastro de novos usuários e manifestações',
    icon: 'UserPlus',
    type: 'business',
    route: '/admin/users'
  },
  {
    name: 'Authentication',
    displayName: 'Login',
    description: 'Acesso à plataforma',
    icon: 'LogIn',
    type: 'business',
    route: '/auth'
  }
];

// Serviços Técnicos (Admin)
export const TECHNICAL_SERVICES: ServiceConfig[] = [
  {
    name: 'Lovable AI',
    displayName: 'Lovable AI',
    description: 'Motor de IA generativa',
    icon: 'Cpu',
    type: 'technical'
  },
  {
    name: 'Cloud Database',
    displayName: 'Banco de Dados',
    description: 'Armazenamento de dados',
    icon: 'Database',
    type: 'technical'
  },
  {
    name: 'Edge Functions',
    displayName: 'Edge Functions',
    description: 'Funções serverless',
    icon: 'Zap',
    type: 'technical'
  },
  {
    name: 'Storage',
    displayName: 'Storage',
    description: 'Armazenamento de arquivos',
    icon: 'HardDrive',
    type: 'technical'
  }
];
