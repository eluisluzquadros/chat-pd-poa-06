import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  TrendingUp,
  BarChart3,
  RefreshCw,
  PlayCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QualityMetrics {
  overall_accuracy: number;
  total_tests: number;
  passed_tests: number;
  avg_response_time: number;
  last_run_at: string;
  category_breakdown: { [key: string]: { total: number; passed: number; accuracy: number } };
  recent_runs: Array<{
    id: string;
    model: string;
    overall_accuracy: number;
    total_tests: number;
    started_at: string;
    status: string;
  }>;
}

interface QualityAlert {
  level: string;
  issues: any;
  metrics: any;
  created_at: string;
}

export default function QualityDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState(false);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch latest validation runs
      const { data: runs, error: runsError } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (runsError) throw runsError;

      // Fetch latest validation results for breakdown
      const latestRun = runs?.[0];
      let categoryBreakdown = {};
      
      if (latestRun) {
        const { data: results, error: resultsError } = await supabase
          .from('qa_validation_results')
          .select(`
            test_case_id,
            is_correct,
            accuracy_score,
            qa_test_cases!inner(category)
          `)
          .eq('validation_run_id', latestRun.id);

        if (resultsError) throw resultsError;

        // Calculate category breakdown
        const categories: { [key: string]: { total: number; passed: number; accuracy: number } } = {};
        
        results?.forEach((result: any) => {
          const category = result.qa_test_cases.category;
          if (!categories[category]) {
            categories[category] = { total: 0, passed: 0, accuracy: 0 };
          }
          categories[category].total++;
          if (result.is_correct) categories[category].passed++;
          categories[category].accuracy += result.accuracy_score;
        });

        // Calculate averages
        Object.keys(categories).forEach(category => {
          const stats = categories[category];
          stats.accuracy = stats.total > 0 ? stats.accuracy / stats.total : 0;
        });

        categoryBreakdown = categories;
      }

      // Fetch quality alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('quality_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;

      setMetrics({
        overall_accuracy: latestRun?.overall_accuracy || 0,
        total_tests: latestRun?.total_tests || 0,
        passed_tests: latestRun?.passed_tests || 0,
        avg_response_time: latestRun?.avg_response_time_ms || 0,
        last_run_at: latestRun?.started_at || '',
        category_breakdown: categoryBreakdown,
        recent_runs: runs || []
      });

      setAlerts(alertsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runQATest = async () => {
    setRunningTest(true);
    try {
      toast({
        title: "Iniciando Teste QA",
        description: "Executando todos os casos de teste...",
      });

      const { data, error } = await supabase.functions.invoke('test-qa-cases');
      
      if (error) throw error;

      toast({
        title: "Teste Concluído",
        description: `${data.passed_tests}/${data.total_cases} casos aprovados (${data.overall_accuracy.toFixed(1)}% acurácia)`,
      });

      // Refresh dashboard data
      await fetchDashboardData();
      
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunningTest(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 90) return { variant: "default", label: "Excelente", icon: CheckCircle };
    if (accuracy >= 70) return { variant: "secondary", label: "Bom", icon: Target };
    return { variant: "destructive", label: "Crítico", icon: AlertTriangle };
  };

  const accuracyStatus = getAccuracyStatus(metrics?.overall_accuracy || 0);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">📊 Dashboard de Qualidade QA</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da acurácia e performance do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={runQATest} disabled={runningTest} size="sm">
            <PlayCircle className="h-4 w-4 mr-2" />
            {runningTest ? "Testando..." : "Executar Teste"}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acurácia Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {metrics?.overall_accuracy.toFixed(1)}%
              </div>
              <Badge variant={accuracyStatus.variant as any}>
                {accuracyStatus.label}
              </Badge>
            </div>
            <Progress value={metrics?.overall_accuracy || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Meta: ≥90%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Casos Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.passed_tests}/{metrics?.total_tests}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total_tests ? ((metrics.passed_tests / metrics.total_tests) * 100).toFixed(1) : 0}% dos casos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avg_response_time}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Meta: &lt;3000ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {metrics?.last_run_at ? new Date(metrics.last_run_at).toLocaleDateString('pt-BR') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.last_run_at ? new Date(metrics.last_run_at).toLocaleTimeString('pt-BR') : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Performance por Categoria</TabsTrigger>
          <TabsTrigger value="runs">Histórico de Execuções</TabsTrigger>
          <TabsTrigger value="alerts">Alertas de Qualidade</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance por Categoria
              </CardTitle>
              <CardDescription>
                Acurácia detalhada por tipo de consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics?.category_breakdown || {}).map(([category, stats]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {stats.passed}/{stats.total}
                        </span>
                        <Badge variant={stats.accuracy >= 70 ? "default" : "destructive"}>
                          {stats.accuracy.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={stats.accuracy} 
                      className={`h-2 ${stats.accuracy >= 70 ? 'bg-green-100' : 'bg-red-100'}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Histórico de Execuções
              </CardTitle>
              <CardDescription>
                Últimas 10 execuções de validação QA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recent_runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                        {run.status}
                      </Badge>
                      <span className="font-medium">{run.model}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{run.overall_accuracy.toFixed(1)}% acurácia</span>
                      <span>{run.total_tests} casos</span>
                      <span className="text-muted-foreground">
                        {new Date(run.started_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Qualidade
              </CardTitle>
              <CardDescription>
                Alertas ativos que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhum alerta ativo!</p>
                  <p className="text-muted-foreground">Sistema funcionando dentro dos parâmetros</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={index} className="p-3 border rounded border-yellow-200 bg-yellow-50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={alert.level === 'error' ? 'destructive' : 'secondary'}>
                          {alert.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {(Array.isArray(alert.issues) ? alert.issues : [alert.issues]).map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-1">
                            <span className="text-yellow-600">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}