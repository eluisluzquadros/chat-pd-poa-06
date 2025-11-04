import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Settings } from 'lucide-react';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';

const statusIcons = {
  operational: CheckCircle2,
  degraded: AlertCircle,
  down: XCircle,
  maintenance: Settings,
};

const statusColors = {
  operational: 'text-green-500',
  degraded: 'text-yellow-500',
  down: 'text-red-500',
  maintenance: 'text-blue-500',
};

const statusLabels = {
  operational: 'Operacional',
  degraded: 'Degradado',
  down: 'Fora do Ar',
  maintenance: 'Manutenção',
};

export function ServiceStatusCards() {
  const { services, isLoading } = usePlatformStatus();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando serviços...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => {
        const StatusIcon = statusIcons[service.status];
        const iconColor = statusColors[service.status];
        
        return (
          <Card key={service.name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon className={`h-5 w-5 ${iconColor}`} />
                    <h4 className="font-medium">{service.name}</h4>
                  </div>
                  <Badge variant={service.status === 'operational' ? 'default' : 'secondary'}>
                    {statusLabels[service.status]}
                  </Badge>
                </div>
                {service.uptime_90d.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(
                      service.uptime_90d.reduce((a, b) => a + b, 0) / service.uptime_90d.length
                    )}% uptime
                  </div>
                )}
              </div>
              
              {service.current_incidents.length > 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {service.current_incidents.length} incidente(s) ativo(s)
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
