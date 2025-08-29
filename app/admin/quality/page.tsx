"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QualityMetrics {
  avgResponseTime: number;
  betaRate: number;
  validResponseRate: number;
  avgConfidence: number;
  totalQueries: number;
  uniqueSessions: number;
}

interface HourlyData {
  hour: string;
  queries: number;
  responseTime: number;
  betaRate: number;
}

export default function QualityDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      // Fetch daily metrics
      const { data: dailyData } = await supabase
        .from('quality_metrics_daily')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (dailyData) {
        setMetrics({
          avgResponseTime: dailyData.avg_response_time,
          betaRate: dailyData.beta_rate,
          validResponseRate: dailyData.valid_response_rate,
          avgConfidence: dailyData.avg_confidence,
          totalQueries: dailyData.total_queries,
          uniqueSessions: dailyData.unique_sessions
        });
      }

      // Fetch hourly data
      const { data: hourlyMetrics } = await supabase
        .from('quality_metrics_hourly')
        .select('*')
        .order('hour', { ascending: true });

      if (hourlyMetrics) {
        const grouped = hourlyMetrics.reduce((acc, curr) => {
          const hour = new Date(curr.hour).getHours();
          if (!acc[hour]) {
            acc[hour] = {
              hour: `${hour}:00`,
              queries: 0,
              responseTime: 0,
              betaRate: 0,
              count: 0
            };
          }
          acc[hour].queries += curr.total_queries;
          acc[hour].responseTime += curr.avg_response_time;
          acc[hour].betaRate += curr.beta_rate;
          acc[hour].count++;
          return acc;
        }, {} as any);

        const hourlyArray = Object.values(grouped).map((h: any) => ({
          hour: h.hour,
          queries: h.queries,
          responseTime: h.responseTime / h.count,
          betaRate: h.betaRate / h.count
        }));

        setHourlyData(hourlyArray);
      }

      // Fetch recent alerts
      const { data: alertData } = await supabase
        .from('quality_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setAlerts(alertData || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Carregando métricas de qualidade...</div>;
  }

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value > threshold ? 'text-red-600' : 'text-green-600';
    }
    return value < threshold ? 'text-red-600' : 'text-green-600';
  };

  const getStatusBadge = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value > threshold ? 'destructive' : 'default';
    }
    return value < threshold ? 'destructive' : 'default';
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoramento de Qualidade</h1>
        <p className="text-muted-foreground">Métricas em tempo real do sistema de respostas</p>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{alert.level === 'critical' ? 'Alerta Crítico' : 'Aviso'}</AlertTitle>
              <AlertDescription>
                {alert.issues.join(', ')}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`text-2xl font-bold ${getStatusColor(metrics?.avgResponseTime || 0, 5000, true)}`}>
                {((metrics?.avgResponseTime || 0) / 1000).toFixed(1)}s
              </span>
            </div>
            <Progress 
              value={Math.min(100, ((metrics?.avgResponseTime || 0) / 5000) * 100)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt; 5s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Respostas Beta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className={`text-2xl font-bold ${getStatusColor((metrics?.betaRate || 0) * 100, 5, true)}`}>
                {((metrics?.betaRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(metrics?.betaRate || 0) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt; 5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className={`text-2xl font-bold ${getStatusColor((metrics?.validResponseRate || 0) * 100, 80)}`}>
                {((metrics?.validResponseRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(metrics?.validResponseRate || 0) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Meta: &gt; 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${getStatusColor((metrics?.avgConfidence || 0), 0.7)}`}>
                {(metrics?.avgConfidence || 0).toFixed(2)}
              </span>
            </div>
            <Progress 
              value={(metrics?.avgConfidence || 0) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Meta: &gt; 0.7</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consultas por Hora</CardTitle>
            <CardDescription>Distribuição de consultas nas últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="queries" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo de Resposta por Hora</CardTitle>
            <CardDescription>Evolução do tempo de resposta</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Consultas</p>
              <p className="text-2xl font-bold">{metrics?.totalQueries || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessões Únicas</p>
              <p className="text-2xl font-bold">{metrics?.uniqueSessions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consultas/Sessão</p>
              <p className="text-2xl font-bold">
                {metrics?.uniqueSessions ? (metrics.totalQueries / metrics.uniqueSessions).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Geral</p>
              <Badge 
                variant={
                  metrics && 
                  metrics.betaRate < 0.05 && 
                  metrics.validResponseRate > 0.8 && 
                  metrics.avgResponseTime < 5000
                    ? 'default' 
                    : 'destructive'
                }
                className="mt-1"
              >
                {metrics && 
                 metrics.betaRate < 0.05 && 
                 metrics.validResponseRate > 0.8 && 
                 metrics.avgResponseTime < 5000
                  ? 'Operacional' 
                  : 'Atenção Necessária'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}