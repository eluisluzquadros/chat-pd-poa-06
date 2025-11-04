import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';
import { BUSINESS_SERVICES } from '@/types/platform';
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Clock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Header } from '@/components/Header';

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

export function PublicStatusPage() {
  const { services, isAllOperational, isLoading } = usePlatformStatus(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-24 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lastUpdate = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Status do Sistema</h1>
          <p className="text-muted-foreground">
            Acompanhe a disponibilidade dos serviços do Plano Diretor
          </p>
        </div>

        {/* Status Banner */}
        <Card className={`mb-8 ${isAllOperational ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}`}>
          <div className={`p-6 ${isAllOperational ? 'bg-green-50 dark:bg-green-950' : 'bg-yellow-50 dark:bg-yellow-950'}`}>
            <div className="flex items-start gap-3">
              {isAllOperational ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              <div>
                <h2 className={`text-lg font-semibold mb-1 ${isAllOperational ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                  {isAllOperational ? 'Sistema funcionando normalmente' : 'Alguns recursos podem estar instáveis'}
                </h2>
                <p className={`text-sm ${isAllOperational ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {isAllOperational 
                    ? 'Nenhum problema reportado no momento' 
                    : 'Estamos trabalhando para resolver os problemas o mais rápido possível'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {BUSINESS_SERVICES.map(serviceConfig => {
            const service = services.find(s => s.name === serviceConfig.name);
            const status = service?.status || 'operational';
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const IconComponent = LucideIcons[serviceConfig.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
            
            const uptime = service?.uptime_90d?.length 
              ? (service.uptime_90d.reduce((a, b) => a + b, 0) / service.uptime_90d.length).toFixed(1)
              : '100.0';

            return (
              <Card 
                key={serviceConfig.name}
                className={`p-6 border-2 ${config.border} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {IconComponent && <IconComponent className="h-6 w-6 text-primary" />}
                    <div>
                      <h3 className="font-semibold text-lg">{serviceConfig.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{serviceConfig.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                    <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
                      {config.label}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{uptime}% uptime</span>
                </div>

                {service?.current_incidents && service.current_incidents.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      {service.current_incidents[0].title}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Última atualização: {lastUpdate}</span>
          </div>
          <a 
            href="/auth" 
            className="inline-block hover:text-foreground transition-colors"
          >
            Acesso administrativo
          </a>
        </div>
      </div>
    </div>
  );
}
