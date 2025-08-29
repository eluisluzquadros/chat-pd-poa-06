import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, Play, FileText, BarChart3, Users, 
  TrendingUp, AlertCircle, CheckCircle, XCircle,
  Clock, Zap, Award, Trash2, AlertTriangle
} from 'lucide-react';
import { SystemVersionIndicator } from '@/components/admin/SystemVersionIndicator';
import { toast } from 'sonner';

import { Header } from '@/components/Header';
import { useQAValidator } from '@/hooks/useQAValidator';
import { useQAHistoryReset } from '@/hooks/useQAHistoryReset';

// Import components
import { QATestCasesList } from '@/components/admin/QATestCasesList';
import { QAExecutionHistory } from '@/components/admin/QAExecutionHistory';
import { CognitiveAnalysisPanel } from '@/components/admin/CognitiveAnalysisPanel';
import { QAValidationConfigPanel } from '@/components/admin/QAValidationConfigPanel';
import { QAResetConfirmDialog } from '@/components/admin/QAResetConfirmDialog';

interface Metrics {
  totalValidationRuns: number;
  avgAccuracy: number;
  totalTestCases: number;
  avgResponseTime: number;
  successRate: number;
  activeModels: number;
  lastRunDate: string | null;
}

interface ValidationProgress {
  isRunning: boolean;
  current: number;
  total: number;
  percentage: number;
  currentModel: string;
  status: string;
}

function QualityV2() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalValidationRuns: 0,
    avgAccuracy: 0,
    totalTestCases: 0,
    avgResponseTime: 0,
    successRate: 0,
    activeModels: 0,
    lastRunDate: null
  });
  
  const [modelPerformance, setModelPerformance] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [currentStats, setCurrentStats] = useState<{runs: number; results: number} | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    percentage: 0,
    currentModel: '',
    status: ''
  });

  const [selectedTab, setSelectedTab] = useState('config');
  const [testResults, setTestResults] = useState<any[]>([]);
  
  const { loading: resetLoading, resetHistory, getCurrentStats } = useQAHistoryReset();
  
  // Use the enhanced QA validator hook
  const { runValidation: executeValidation2, isRunning, progress } = useQAValidator();

  // Fetch metrics and data
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Get validation runs
      const { data: runs } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      // Get test cases count
      const { count: testCaseCount } = await supabase
        .from('qa_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get unique models tested
      const { data: models } = await supabase
        .from('qa_validation_runs')
        .select('model')
        .not('model', 'is', null);

      const uniqueModels = new Set(models?.map(m => m.model) || []);

      if (runs && runs.length > 0) {
        const completedRuns = runs.filter(r => r.status === 'completed');
        const avgAccuracy = completedRuns.reduce((sum, run) => sum + (run.overall_accuracy || 0), 0) / (completedRuns.length || 1);
        const avgResponseTime = completedRuns.reduce((sum, run) => sum + (run.avg_response_time_ms || 0), 0) / (completedRuns.length || 1);
        const successRate = completedRuns.filter(r => (r.overall_accuracy || 0) >= 0.7).length / (completedRuns.length || 1);
        
        setMetrics({
          totalValidationRuns: runs.length,
          avgAccuracy: Math.round(avgAccuracy * 100),
          totalTestCases: testCaseCount || 0,
          avgResponseTime: Math.round(avgResponseTime),
          successRate: Math.round(successRate * 100),
          activeModels: uniqueModels.size,
          lastRunDate: runs[0]?.started_at || null
        });

        // Process model performance
        const modelStats = new Map();
        completedRuns.forEach(run => {
          if (run.model) {
            if (!modelStats.has(run.model)) {
              modelStats.set(run.model, {
                model: run.model,
                runs: 0,
                totalAccuracy: 0,
                totalResponseTime: 0,
                passedTests: 0,
                totalTests: 0
              });
            }
            const stats = modelStats.get(run.model);
            stats.runs++;
            stats.totalAccuracy += run.overall_accuracy || 0;
            stats.totalResponseTime += run.avg_response_time_ms || 0;
            stats.passedTests += run.passed_tests || 0;
            stats.totalTests += run.total_tests || 0;
          }
        });

        const performanceData = Array.from(modelStats.values()).map(stats => ({
          model: stats.model,
          accuracy: Math.round((stats.totalAccuracy / stats.runs) * 100),
          avgResponseTime: Math.round(stats.totalResponseTime / stats.runs),
          successRate: Math.round((stats.passedTests / stats.totalTests) * 100),
          totalRuns: stats.runs
        })).sort((a, b) => b.accuracy - a.accuracy);

        setModelPerformance(performanceData);
      }

      // Get recent test results
      const { data: results } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (
            query,
            category,
            difficulty,
            expected_keywords
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setTestResults(results || []);
      
      // Set the most recent run ID for cognitive analysis
      if (runs && runs.length > 0) {
        setSelectedRunId(runs[0].id);
      }

    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle validation execution from new config panel
  const handleValidationExecution = async (config: any) => {
    try {
      // Convert config to format expected by useQAValidator
      const validationOptions = {
        models: config.models,
        mode: config.executionMode,
        randomCount: config.randomCount,
        categories: config.categories,
        difficulties: config.difficulties,
        includeSQL: config.includeSQL,
        excludeSQL: config.excludeSQL
      };

      await executeValidation2(validationOptions);
      
      // Refresh metrics after validation
      setTimeout(() => {
        fetchMetrics();
      }, 2000);

    } catch (error) {
      console.error('Validation execution error:', error);
      toast.error(`Erro na execução: ${error.message}`);
    }
  };

  // Helper functions
  const evaluateAnswer = (answer: string, testCase: any): boolean => {
    if (!answer || !testCase.expected_keywords?.length) return false;
    
    const normalizedAnswer = answer.toLowerCase();
    const matchedKeywords = testCase.expected_keywords.filter((keyword: string) => 
      normalizedAnswer.includes(keyword.toLowerCase())
    );
    
    return matchedKeywords.length >= (testCase.expected_keywords.length * 0.6);
  };

  const calculateAccuracy = (answer: string, testCase: any): number => {
    if (!answer || !testCase.expected_keywords?.length) return 0;
    
    const normalizedAnswer = answer.toLowerCase();
    const matchedKeywords = testCase.expected_keywords.filter((keyword: string) => 
      normalizedAnswer.includes(keyword.toLowerCase())
    );
    
    return matchedKeywords.length / testCase.expected_keywords.length;
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Qualidade QA</h1>
          <p className="text-muted-foreground mt-1">
            Monitore e valide a qualidade das respostas do sistema
          </p>
        </div>
        <div className="flex gap-3">
          <SystemVersionIndicator />
          <Button 
            variant="outline" 
            onClick={fetchMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && progress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Executando validação QA...</span>
                <span>{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso: {progress.current} de {progress.total}</span>
                <span>Múltiplos modelos sendo testados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execuções Totais</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalValidationRuns}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.lastRunDate ? `Última: ${new Date(metrics.lastRunDate).toLocaleDateString('pt-BR')}` : 'Nenhuma execução'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acurácia Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgAccuracy}%</div>
            <Badge variant={metrics.avgAccuracy >= 80 ? "default" : metrics.avgAccuracy >= 60 ? "secondary" : "destructive"}>
              {metrics.avgAccuracy >= 80 ? "Excelente" : metrics.avgAccuracy >= 60 ? "Bom" : "Precisa Melhorar"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgResponseTime < 2000 ? "Rápido" : metrics.avgResponseTime < 5000 ? "Normal" : "Lento"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeModels} modelos testados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="executions">Execuções</TabsTrigger>
          <TabsTrigger value="cases">Casos de Teste</TabsTrigger>
          <TabsTrigger value="cognitive">Análise Cognitiva</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <QAValidationConfigPanel 
            onExecute={handleValidationExecution}
            isRunning={isRunning}
          />
          
          {/* Zona de Perigo - Reset Completo */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium mb-2">Reset Completo do Histórico QA</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Delete permanentemente todo o histórico de execuções, resultados e métricas.
                  Esta ação é irreversível e permitirá começar com dados limpos.
                </p>
                {currentStats && (
                  <p className="text-xs text-muted-foreground mb-3">
                    <strong>Dados atuais:</strong> {currentStats.runs} execuções, {currentStats.results} resultados
                  </p>
                )}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={async () => {
                    const stats = await getCurrentStats();
                    setCurrentStats(stats);
                    setResetDialogOpen(true);
                  }}
                  disabled={resetLoading}
                  className="gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Reset Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de Casos de Teste</span>
                    <span className="font-medium">{metrics.totalTestCases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelos Ativos</span>
                    <span className="font-medium">{metrics.activeModels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execuções Completas</span>
                    <span className="font-medium">{metrics.totalValidationRuns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sistema RAG</span>
                    <SystemVersionIndicator />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Acurácia</span>
                      <span className="text-sm font-medium">{metrics.avgAccuracy}%</span>
                    </div>
                    <Progress value={metrics.avgAccuracy} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Taxa de Sucesso</span>
                      <span className="text-sm font-medium">{metrics.successRate}%</span>
                    </div>
                    <Progress value={metrics.successRate} />
                  </div>
                  <div className="pt-2">
                    <Badge variant="outline" className="mr-2">
                      <Zap className="h-3 w-3 mr-1" />
                      {metrics.avgResponseTime}ms médio
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.slice(0, 5).map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {result.qa_test_cases?.query?.substring(0, 60)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.qa_test_cases?.category} • {result.qa_test_cases?.difficulty}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={result.is_correct ? "default" : "destructive"}>
                        {Math.round((result.accuracy_score || 0) * 100)}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.response_time_ms}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <QAExecutionHistory />
        </TabsContent>

        <TabsContent value="cases">
          <QATestCasesList />
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Modelo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelPerformance.map((model, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{model.model}</h4>
                        <p className="text-sm text-muted-foreground">
                          {model.totalRuns} execuções
                        </p>
                      </div>
                      <Badge variant={model.accuracy >= 80 ? "default" : "secondary"}>
                        {model.accuracy}% acurácia
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tempo Médio:</span>
                        <p className="font-medium">{model.avgResponseTime}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taxa de Sucesso:</span>
                        <p className="font-medium">{model.successRate}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ranking:</span>
                        <p className="font-medium">#{idx + 1}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {modelPerformance.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum modelo testado ainda. Execute uma validação para ver os resultados.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cognitive">
          <CognitiveAnalysisPanel 
            runId={selectedRunId || undefined}
            autoAnalyze={false}
          />
        </TabsContent>
      </Tabs>
      
      {/* Reset Confirmation Dialog */}
      <QAResetConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={async () => {
          const result = await resetHistory();
          if (result.success) {
            setResetDialogOpen(false);
            // Refresh metrics after successful reset
            await fetchMetrics();
            // Clear current stats
            setCurrentStats(null);
          }
        }}
        loading={resetLoading}
        currentStats={currentStats || undefined}
      />
          </div>
        </main>
      </div>
  );
}

export default QualityV2;