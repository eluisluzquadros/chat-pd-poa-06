import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Info, AlertCircle, CheckCircle2, FileText, Eye } from "lucide-react";
import { Period, TimeRange } from "@/utils/dateUtils";

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  acknowledged: boolean;
  data?: {
    session_id?: string;
    user_id?: string;
    user_email?: string;
    user_full_name?: string;
    user_message?: string;
    ip_address?: string;
    sentiment?: string;
    keywords?: string[];
    [key: string]: any;
  };
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

  const handleGenerateReport = async (alert: Alert) => {
    if (!alert.data?.session_id) {
      toast.error('ID da sessão não encontrado');
      return;
    }

    try {
      toast.loading('Gerando relatório forense...', { id: 'report-gen' });
      
      const { data, error } = await supabase.functions.invoke('generate-security-report', {
        body: {
          sessionId: alert.data.session_id,
          alertId: alert.id,
        }
      });

      if (error) throw error;

      // Download report as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-incident-${data.report_metadata.report_id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Relatório forense gerado com sucesso', { id: 'report-gen' });
      
      // Show summary
      toast.info(
        `Relatório ID: ${data.report_metadata.report_id}\n` +
        `Nível de ameaça: ${data.incident_classification.severity.toUpperCase()}\n` +
        `Status: ${data.incident_classification.status}`,
        { duration: 8000 }
      );
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório forense', { id: 'report-gen' });
    }
  };

  const handleViewConversation = (sessionId: string) => {
    window.open(`/chat/${sessionId}`, '_blank');
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
                        <p className="text-xs text-muted-foreground mb-3">
                          {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                        </p>
                        
                        {/* Alert Details */}
                        {alert.data && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                            {alert.data.user_email && (
                              <div className="flex justify-between">
                                <span className="font-medium">Usuário:</span>
                                <span className="text-muted-foreground">{alert.data.user_email}</span>
                              </div>
                            )}
                            {alert.data.ip_address && (
                              <div className="flex justify-between">
                                <span className="font-medium">IP:</span>
                                <span className="font-mono text-xs">{alert.data.ip_address}</span>
                              </div>
                            )}
                            {alert.data.session_id && (
                              <div className="flex justify-between">
                                <span className="font-medium">Sessão:</span>
                                <span className="font-mono text-xs truncate max-w-[200px]">{alert.data.session_id}</span>
                              </div>
                            )}
                            {alert.data.user_message && (
                              <div className="mt-2 pt-2 border-t">
                                <span className="font-medium block mb-1">Mensagem suspeita:</span>
                                <p className="text-xs text-muted-foreground italic line-clamp-2">
                                  "{alert.data.user_message}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {alert.severity === 'critical' && alert.data?.session_id && (
                            <Button 
                              onClick={() => handleGenerateReport(alert)} 
                              size="sm" 
                              variant="destructive"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Relatório Jurídico
                            </Button>
                          )}
                          
                          {alert.data?.session_id && (
                            <Button 
                              onClick={() => handleViewConversation(alert.data.session_id!)} 
                              size="sm" 
                              variant="outline"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Conversa
                            </Button>
                          )}
                          
                          {!alert.acknowledged && (
                            <Button 
                              onClick={() => handleAcknowledge(alert.id)} 
                              size="sm" 
                              variant="outline"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar como Lido
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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
