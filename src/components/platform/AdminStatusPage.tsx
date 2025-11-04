import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';
import { BUSINESS_SERVICES, TECHNICAL_SERVICES } from '@/types/platform';
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Eye, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IncidentTimeline } from '../admin/platform/IncidentTimeline';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  operational: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    label: 'Operacional'
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    label: 'Instável'
  },
  down: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    label: 'Indisponível'
  },
  maintenance: {
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'Manutenção'
  }
};

export function AdminStatusPage() {
  const navigate = useNavigate();
  const { services, recentEvents, isAllOperational, isLoading } = usePlatformStatus(true);
  const [viewAsPublic, setViewAsPublic] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (viewAsPublic) {
    // Redirect to public view
    window.location.href = '/status?view=public';
    return null;
  }

  const renderServiceCard = (serviceConfig: typeof BUSINESS_SERVICES[0]) => {
    const service = services.find(s => s.name === serviceConfig.name);
    const status = service?.status || 'operational';
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const IconComponent = LucideIcons[serviceConfig.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
    
    const uptime = service?.uptime_90d?.length 
      ? (service.uptime_90d.reduce((a, b) => a + b, 0) / service.uptime_90d.length).toFixed(1)
      : '100.0';

    return (
      <Card key={serviceConfig.name} className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {IconComponent && <IconComponent className="h-5 w-5 text-muted-foreground" />}
            <div>
              <h3 className="font-medium">{serviceConfig.displayName}</h3>
              <p className="text-xs text-muted-foreground">{serviceConfig.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{uptime}%</span>
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <Badge variant="outline" className={`${config.bg} ${config.color} border-0 text-xs`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </div>

        {service?.current_incidents && service.current_incidents.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              ⚠️ {service.current_incidents[0].title}
            </p>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Status da Plataforma</h1>
            <p className="text-muted-foreground">Monitoramento completo dos serviços</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/status?view=public'}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver como usuário
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/admin/settings?tab=plataforma')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        <Card className={`mb-8 ${isAllOperational ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}`}>
          <div className={`p-4 ${isAllOperational ? 'bg-green-50 dark:bg-green-950' : 'bg-yellow-50 dark:bg-yellow-950'}`}>
            <div className="flex items-center gap-3">
              {isAllOperational ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <span className={`font-semibold ${isAllOperational ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                  {isAllOperational ? 'Todos os sistemas operacionais' : 'Incidentes ativos detectados'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList>
            <TabsTrigger value="services">Serviços de Negócio</TabsTrigger>
            <TabsTrigger value="infrastructure">Infraestrutura</TabsTrigger>
            <TabsTrigger value="incidents">Incidentes</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Serviços de Negócio</h2>
              <p className="text-sm text-muted-foreground">Serviços visíveis para usuários finais</p>
            </div>
            {BUSINESS_SERVICES.map(renderServiceCard)}
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Infraestrutura Técnica</h2>
              <p className="text-sm text-muted-foreground">Serviços de backend e infraestrutura</p>
            </div>
            {TECHNICAL_SERVICES.map(renderServiceCard)}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Histórico de Incidentes</h2>
              <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
            </div>
            {recentEvents.length > 0 ? (
              <IncidentTimeline events={recentEvents} />
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum incidente reportado nos últimos 30 dias</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
