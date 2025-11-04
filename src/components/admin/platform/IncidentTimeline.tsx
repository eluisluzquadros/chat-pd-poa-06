import React from 'react';
import { PlatformStatusEvent } from '@/types/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IncidentTimelineProps {
  incidents: PlatformStatusEvent[];
  onEdit?: (incident: PlatformStatusEvent) => void;
  showActions?: boolean;
}

const severityColors = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusColors = {
  investigating: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  identified: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  monitoring: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function IncidentTimeline({ incidents, onEdit, showActions }: IncidentTimelineProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum incidente encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <Card key={incident.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={severityColors[incident.severity]}>
                    {incident.severity}
                  </Badge>
                  <Badge variant="outline" className={statusColors[incident.status]}>
                    {incident.status}
                  </Badge>
                  {incident.status === 'resolved' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>

                <h4 className="font-medium mb-1">{incident.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Serviço: {incident.service_name}</span>
                  <span>
                    Iniciado há{' '}
                    {formatDistanceToNow(new Date(incident.started_at), {
                      locale: ptBR,
                      addSuffix: false,
                    })}
                  </span>
                  {incident.duration_minutes && (
                    <span>Duração: {incident.duration_minutes} min</span>
                  )}
                  {incident.affected_users > 0 && (
                    <span>Usuários afetados: {incident.affected_users}</span>
                  )}
                </div>

                {incident.updates && incident.updates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h5 className="text-sm font-medium">Atualizações:</h5>
                    {incident.updates.map((update, idx) => (
                      <div key={idx} className="text-sm pl-4 border-l-2 border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(update.timestamp).toLocaleString('pt-BR')}</span>
                          <Badge variant="outline" className="text-xs">
                            {update.status}
                          </Badge>
                        </div>
                        <p className="mt-1">{update.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showActions && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(incident)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
