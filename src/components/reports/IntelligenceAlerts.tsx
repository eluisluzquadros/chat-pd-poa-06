import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Period, TimeRange } from "@/utils/dateUtils";

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  acknowledged: boolean;
}

interface IntelligenceAlertsProps {
  period: Period;
  timeRange: TimeRange;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'bg-blue-500', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500', label: 'Aviso' },
  critical: { icon: AlertCircle, color: 'bg-red-500', label: 'Crítico' },
};

export function IntelligenceAlerts({ period, timeRange }: IntelligenceAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [period, timeRange]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('intelligence_alerts')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao buscar alertas:', error);
      toast.error('Erro ao carregar alertas');
    } else {
      setAlerts(data || []);
    }
    setIsLoading(false);
  };

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('intelligence_alerts')
      .update({ 
        acknowledged: true, 
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id 
      })
      .eq('id', alertId);

    if (error) {
      toast.error('Erro ao marcar alerta como lido');
    } else {
      toast.success('Alerta marcado como lido');
      fetchAlerts();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const unacknowledged = alerts.filter(a => !a.acknowledged);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Inteligentes</CardTitle>
        <CardDescription>
          {unacknowledged.length} alerta(s) não reconhecido(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-muted-foreground">Nenhum alerta no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.acknowledged ? 'bg-muted/50 opacity-60' : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${config.color} bg-opacity-10`}>
                        <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{alert.title}</h4>
                          <Badge variant={alert.acknowledged ? "secondary" : "default"}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Marcar como lido
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
