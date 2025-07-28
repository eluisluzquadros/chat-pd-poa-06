import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle } from "lucide-react";
import { useAuthContext } from "@/context/auth/useAuthContext";
import { useNavigate } from "react-router-dom";
import { SimpleRoleGuard } from "@/components/SimpleRoleGuard";

interface QualityMetrics {
  betaRate: number;
  avgResponseTime: number;
  successRate: number;
  totalQueries: number;
  avgConfidence: number;
  uniqueSessions: number;
}

export default function Quality() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadMetrics();
  }, [user, navigate]);

  const loadMetrics = async () => {
    try {
      // Fetch quality metrics from the last 24 hours
      const { data: metricsData, error: metricsError } = await supabase
        .from('quality_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (metricsError) throw metricsError;

      if (metricsData && metricsData.length > 0) {
        // Calculate metrics
        const totalQueries = metricsData.length;
        const betaMessages = metricsData.filter(m => m.has_beta_message).length;
        const validResponses = metricsData.filter(m => m.has_valid_response).length;
        const avgResponseTime = metricsData.reduce((sum, m) => sum + m.response_time, 0) / totalQueries;
        const avgConfidence = metricsData.reduce((sum, m) => sum + (m.confidence || 0), 0) / totalQueries;
        const uniqueSessions = new Set(metricsData.map(m => m.session_id)).size;

        setMetrics({
          betaRate: (betaMessages / totalQueries) * 100,
          avgResponseTime: avgResponseTime / 1000, // Convert to seconds
          successRate: (validResponses / totalQueries) * 100,
          totalQueries,
          avgConfidence: avgConfidence * 100,
          uniqueSessions
        });
      } else {
        setMetrics({
          betaRate: 0,
          avgResponseTime: 0,
          successRate: 100,
          totalQueries: 0,
          avgConfidence: 0,
          uniqueSessions: 0
        });
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Erro ao carregar métricas de qualidade');
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatus = (value: number, threshold: number, inverse: boolean = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return {
      color: isGood ? "text-green-600" : "text-red-600",
      icon: isGood ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      status: isGood ? "PASS" : "FAIL"
    };
  };

  return (
    <SimpleRoleGuard requiredRole="admin">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Qualidade</h1>
          <p className="text-muted-foreground">Métricas em tempo real do sistema</p>
        </div>

        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Beta Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Taxa de Respostas Beta</CardTitle>
                  <CardDescription>Meta: {'<'}5%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{metrics.betaRate.toFixed(1)}%</span>
                      <div className={getMetricStatus(metrics.betaRate, 5, true).color}>
                        {getMetricStatus(metrics.betaRate, 5, true).icon}
                      </div>
                    </div>
                    <Progress value={metrics.betaRate} className="h-2" />
                    <p className={`text-sm ${getMetricStatus(metrics.betaRate, 5, true).color}`}>
                      {getMetricStatus(metrics.betaRate, 5, true).status}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tempo Médio de Resposta</CardTitle>
                  <CardDescription>Meta: {'<'}3s</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(1)}s</span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Progress value={Math.min((metrics.avgResponseTime / 5) * 100, 100)} className="h-2" />
                    <p className={`text-sm ${getMetricStatus(metrics.avgResponseTime, 3, true).color}`}>
                      {getMetricStatus(metrics.avgResponseTime, 3, true).status}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Taxa de Sucesso</CardTitle>
                  <CardDescription>Meta: {'>'}80%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <Progress value={metrics.successRate} className="h-2" />
                    <p className={`text-sm ${getMetricStatus(metrics.successRate, 80).color}`}>
                      {getMetricStatus(metrics.successRate, 80).status}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Total Queries */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total de Consultas</CardTitle>
                  <CardDescription>Últimas 24 horas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalQueries}</div>
                </CardContent>
              </Card>

              {/* Average Confidence */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Confiança Média</CardTitle>
                  <CardDescription>Meta: {'>'}70%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{metrics.avgConfidence.toFixed(1)}%</div>
                    <Progress value={metrics.avgConfidence} className="h-2" />
                    <p className={`text-sm ${getMetricStatus(metrics.avgConfidence, 70).color}`}>
                      {getMetricStatus(metrics.avgConfidence, 70).status}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Unique Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sessões Únicas</CardTitle>
                  <CardDescription>Últimas 24 horas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.uniqueSessions}</div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Alert */}
            <Alert className={metrics.betaRate < 5 && metrics.avgResponseTime < 3 && metrics.successRate > 80 ? "border-green-500" : "border-yellow-500"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {metrics.betaRate < 5 && metrics.avgResponseTime < 3 && metrics.successRate > 80
                  ? "✅ Todas as métricas estão dentro das metas estabelecidas!"
                  : "⚠️ Algumas métricas precisam de atenção."}
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </SimpleRoleGuard>
  );
}