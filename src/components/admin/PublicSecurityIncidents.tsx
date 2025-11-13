import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Shield, CheckCircle2, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PublicIncident {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  visibility: string;
  data?: any;
}

export function PublicSecurityIncidents() {
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPublicIncidents();
  }, []);

  const fetchPublicIncidents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('intelligence_alerts')
      .select('*')
      .eq('visibility', 'public')
      .order('triggered_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setIncidents(data);
      
      // Agrupar por dia para o gráfico
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const grouped = last30Days.map(date => {
        const count = data.filter(inc => 
          inc.triggered_at.startsWith(date)
        ).length;
        return { date: date.slice(5), count };
      });

      setChartData(grouped);
    }
    setIsLoading(false);
  };

  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, any> = {
      critical: { color: 'destructive', icon: AlertTriangle, label: 'Crítico' },
      high: { color: 'default', icon: Shield, label: 'Alto' },
      medium: { color: 'secondary', icon: Clock, label: 'Médio' },
      low: { color: 'outline', icon: CheckCircle2, label: 'Baixo' },
    };
    return configs[severity] || configs.low;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse">Carregando incidentes públicos...</div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = incidents.filter(i => i.severity === 'critical').length;
  const highCount = incidents.filter(i => i.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Público</p>
                <p className="text-2xl font-bold">{incidents.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alta Severidade</p>
                <p className="text-2xl font-bold">{highCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Incidentes (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes Públicos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">Nenhum incidente público no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => {
                const config = getSeverityConfig(incident.severity);
                const Icon = config.icon;

                return (
                  <div
                    key={incident.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-5 w-5 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold">{incident.title}</h4>
                            <Badge variant={config.color as any}>
                              {config.label}
                            </Badge>
                            <Badge variant="outline">
                              🌐 Público
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {incident.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(incident.triggered_at).toLocaleString('pt-BR')}
                          </p>
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
    </div>
  );
}
