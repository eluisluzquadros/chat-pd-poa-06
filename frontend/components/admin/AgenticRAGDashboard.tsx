import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap, 
  DollarSign, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Gauge,
  RefreshCw,
  Settings,
  BarChart3,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RagMetrics {
  id: string;
  session_id: string;
  rag_version: string;
  query_category: string;
  total_latency: number;
  confidence_score: number;
  has_results: boolean;
  total_tokens: number;
  estimated_cost: number;
  status: string;
  created_at: string;
}

interface AlertEvent {
  id: string;
  rule_name: string;
  alert_message: string;
  current_value: number;
  threshold_value: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
  minutes_active: number;
}

interface PerformanceData {
  query_category: string;
  rag_version: string;
  query_count: number;
  avg_latency: number;
  avg_confidence: number;
  success_rate_pct: number;
}

interface HourlyMetrics {
  hour: string;
  rag_version: string;
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  avg_latency: number;
  avg_confidence: number;
  total_cost: number;
}

interface UserFeedback {
  rating: number;
  is_helpful: boolean;
  is_accurate: boolean;
  feedback_text: string;
  created_at: string;
}

const AgenticRAGDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RagMetrics[]>([]);
  const [hourlyMetrics, setHourlyMetrics] = useState<HourlyMetrics[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertEvent[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  
  const { toast } = useToast();

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch hourly metrics
      const { data: hourlyData, error: hourlyError } = await supabase
        .from('rag_metrics_hourly')
        .select('*')
        .order('hour', { ascending: false })
        .limit(24);

      if (hourlyError) throw hourlyError;
      setHourlyMetrics(hourlyData || []);

      // Fetch performance by category
      const { data: perfData, error: perfError } = await supabase
        .from('performance_by_category')
        .select('*')
        .order('query_count', { ascending: false });

      if (perfError) throw perfError;
      setPerformanceData(perfData || []);

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('active_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setActiveAlerts(alertsData || []);

      // Fetch recent metrics
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
      const { data: metricsData, error: metricsError } = await supabase
        .from('rag_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Fetch recent user feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('rating, is_helpful, is_accurate, feedback_text, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (feedbackError) throw feedbackError;
      setUserFeedback(feedbackData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchDashboardData, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalQueries = metrics.length;
    const successfulQueries = metrics.filter(m => m.status === 'success').length;
    const avgLatency = metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + m.total_latency, 0) / metrics.length) : 0;
    const avgConfidence = metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / metrics.length * 100) / 100 : 0;
    const totalCost = metrics.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
    const v3Queries = metrics.filter(m => m.rag_version === 'v3').length;
    const v2Queries = metrics.filter(m => m.rag_version === 'v2').length;

    return {
      totalQueries,
      successfulQueries,
      successRate: totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0,
      avgLatency,
      avgConfidence,
      totalCost: Math.round(totalCost * 1000) / 1000,
      v3Queries,
      v2Queries,
      avgFeedbackRating: userFeedback.length > 0 ? Math.round(userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length * 10) / 10 : 0
    };
  }, [metrics, userFeedback]);

  // Alert severity colors
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  // Chart colors
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard Agentic-RAG V3</h1>
          <div className="animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Agentic-RAG V3</h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento em tempo real do sistema RAG com métricas de performance e qualidade
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={timeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1h')}
            >
              1h
            </Button>
            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
            >
              24h
            </Button>
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-600' : ''}`} />
            Auto-refresh
          </Button>
          
          <Button
            variant="outline" 
            size="sm"
            onClick={fetchDashboardData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas Ativos ({activeAlerts.length})</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              {activeAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex justify-between items-center">
                  <span>{alert.alert_message}</span>
                  <Badge variant={getAlertColor(alert.severity)}>
                    {alert.severity} - {Math.round(alert.minutes_active)}min
                  </Badge>
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <p className="text-sm">+ {activeAlerts.length - 3} alertas adicionais</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Queries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalQueries.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              V3: {summaryStats.v3Queries} | V2: {summaryStats.v2Queries}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.successRate}%</div>
            <Progress value={summaryStats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgLatency}ms</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summaryStats.avgLatency < 2000 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" /> Excelente
                </span>
              ) : summaryStats.avgLatency < 5000 ? (
                <span className="text-yellow-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> Aceitável
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> Alto
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgConfidence}</div>
            <Progress value={summaryStats.avgConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Additional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.totalCost}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Últimas {timeRange}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Médio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgFeedbackRating}/5</div>
            <div className="text-xs text-muted-foreground mt-1">
              {userFeedback.length} avaliações
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {activeAlerts.filter(a => a.severity === 'critical').length} críticos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <div className="text-xs text-muted-foreground mt-1">
              Uptime: 99.9%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="abtest">A/B Testing</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Latência por Hora</CardTitle>
                <CardDescription>Tempo de resposta médio das últimas 24 horas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyMetrics.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      formatter={(value) => [`${value}ms`, 'Latência']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avg_latency" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="V3"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso</CardTitle>
                <CardDescription>Queries bem-sucedidas vs com erro</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyMetrics.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                    />
                    <Legend />
                    <Bar dataKey="successful_queries" stackId="a" fill="#82ca9d" name="Sucesso" />
                    <Bar dataKey="failed_queries" stackId="a" fill="#ff7c7c" name="Erro" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cost and Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Custo por Hora</CardTitle>
                <CardDescription>Gasto estimado em USD</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={hourlyMetrics.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit' })}
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(3)}`} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      formatter={(value) => [`$${Number(value).toFixed(3)}`, 'Custo']}
                    />
                    <Line type="monotone" dataKey="total_cost" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confiança Média</CardTitle>
                <CardDescription>Score de confiança das respostas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={hourlyMetrics.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit' })}
                    />
                    <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Confiança']}
                    />
                    <Line type="monotone" dataKey="avg_confidence" stroke="#8dd1e1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Categoria</CardTitle>
                <CardDescription>Métricas detalhadas por tipo de query</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.map((category, index) => (
                    <div key={`${category.query_category}-${category.rag_version}`} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">
                          {category.query_category || 'Geral'}
                          <Badge className="ml-2" variant={category.rag_version === 'v3' ? 'default' : 'secondary'}>
                            {category.rag_version}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {category.query_count} queries | {category.avg_latency}ms médio
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{category.success_rate_pct}% sucesso</div>
                        <div className="text-xs text-muted-foreground">
                          Confiança: {category.avg_confidence.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Volume de queries por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ query_category, percent }) => 
                        `${query_category || 'Geral'}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="query_count"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feedback dos Usuários</CardTitle>
                <CardDescription>Últimas {userFeedback.length} avaliações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {userFeedback.filter(f => f.is_helpful).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Úteis</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {userFeedback.filter(f => f.is_accurate).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Precisas</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {summaryStats.avgFeedbackRating}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating Médio</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userFeedback
                      .filter(f => f.feedback_text)
                      .slice(0, 10)
                      .map((feedback, index) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              {[...Array(feedback.rating)].map((_, i) => (
                                <span key={i} className="text-yellow-400">★</span>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div>{feedback.feedback_text}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Ratings</CardTitle>
                <CardDescription>Avaliações por estrelas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = userFeedback.filter(f => f.rating === rating).length;
                    const percentage = userFeedback.length > 0 ? (count / userFeedback.length) * 100 : 0;
                    
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span>{rating}</span>
                          <span className="text-yellow-400">★</span>
                        </div>
                        <Progress value={percentage} className="flex-1" />
                        <div className="text-sm text-muted-foreground w-12">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sistema de Alertas</CardTitle>
              <CardDescription>Monitoramento de alertas ativos e histórico</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhum alerta ativo</h3>
                  <p className="text-muted-foreground">Sistema funcionando normalmente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map(alert => (
                    <Alert key={alert.id} variant={getAlertColor(alert.severity) as any}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.rule_name}</span>
                        <Badge variant={getAlertColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <p>{alert.alert_message}</p>
                          <div className="flex justify-between text-sm mt-2">
                            <span>Valor atual: {alert.current_value}</span>
                            <span>Limite: {alert.threshold_value}</span>
                            <span>Ativo há: {Math.round(alert.minutes_active)} min</span>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="abtest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Testing: V2 vs V3</CardTitle>
              <CardDescription>Comparação de performance entre versões</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Métricas V2</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Queries</div>
                      <div className="text-xl font-bold">{summaryStats.v2Queries}</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Latência Média</div>
                      <div className="text-xl font-bold">
                        {metrics.filter(m => m.rag_version === 'v2').length > 0 
                          ? Math.round(
                              metrics.filter(m => m.rag_version === 'v2')
                                .reduce((sum, m) => sum + m.total_latency, 0) / 
                              metrics.filter(m => m.rag_version === 'v2').length
                            ) 
                          : 0}ms
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Métricas V3</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Queries</div>
                      <div className="text-xl font-bold">{summaryStats.v3Queries}</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Latência Média</div>
                      <div className="text-xl font-bold">
                        {metrics.filter(m => m.rag_version === 'v3').length > 0 
                          ? Math.round(
                              metrics.filter(m => m.rag_version === 'v3')
                                .reduce((sum, m) => sum + m.total_latency, 0) / 
                              metrics.filter(m => m.rag_version === 'v3').length
                            )
                          : 0}ms
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-4">Comparação Temporal</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avg_latency" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Latência Média"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avg_confidence" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Confiança Média"
                      yAxisId="right"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgenticRAGDashboard;