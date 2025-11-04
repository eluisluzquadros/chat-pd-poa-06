import React from 'react';
import { ServiceStatus } from '@/types/platform';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Settings } from 'lucide-react';
import { UptimeBar } from './UptimeBar';

interface ServiceStatusCardProps {
  service: ServiceStatus;
}

const statusConfig = {
  operational: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    label: 'Operacional',
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    label: 'Degradado',
  },
  down: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    label: 'Fora do Ar',
  },
  maintenance: {
    icon: Settings,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    label: 'Manutenção',
  },
};

export function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const config = statusConfig[service.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div className="flex items-center gap-4 flex-1">
        <StatusIcon className={`h-5 w-5 ${config.color}`} />
        <div className="flex-1">
          <h3 className="font-medium">{service.name}</h3>
          {service.current_incidents.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {service.current_incidents[0].description}
            </p>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={`${config.bgColor} ${config.color} ${config.borderColor}`}
        >
          {config.label}
        </Badge>
      </div>

      {service.uptime_90d.length > 0 && (
        <div className="ml-8">
          <UptimeBar uptimeData={service.uptime_90d} />
        </div>
      )}
    </div>
  );
}
