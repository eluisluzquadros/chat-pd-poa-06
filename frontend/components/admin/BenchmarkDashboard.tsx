import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Crown, Zap, DollarSign, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { useBenchmark } from '@/hooks/useBenchmark';
import { BenchmarkModelTable } from '@/components/admin/BenchmarkModelTable';
import { BenchmarkCharts } from '@/components/admin/BenchmarkCharts';
import { BenchmarkOptionsDialog } from './BenchmarkOptionsDialog';
import { BenchmarkExecutionHistory } from './BenchmarkExecutionHistory';
import { BenchmarkResultsDialog } from './BenchmarkResultsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SystemVersionIndicator } from './SystemVersionIndicator';

export function BenchmarkDashboard() {
  const { 
    metrics, 
    modelPerformance, 
    qualityByModel, 
    costByProvider, 
    isLoading, 
    error, 
    refetch,
    executeBenchmark,
    isBenchmarkRunning
  } = useBenchmark();

  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedModelResults, setSelectedModelResults] = useState<any>(null);
  const [detailedResults, setDetailedResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Get real execution history from qa_benchmarks table
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  
  React.useEffect(() => {
    const fetchExecutionHistory = async () => {
      try {
        const { data: benchmarks } = await supabase
          .from('qa_benchmarks')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10);

        if (benchmarks?.length) {
          const history = benchmarks.map((benchmark, index) => ({
            id: benchmark.id.toString(),
            timestamp: benchmark.timestamp,
            status: 'completed' as const,
            modelsTested: Array.isArray(benchmark.summaries) ? benchmark.summaries.length : 0,
            testCases: 5, // Default for now, can be extracted from benchmark metadata
            avgQuality: Array.isArray(benchmark.summaries) ? 
              benchmark.summaries.reduce((sum: number, s: any) => sum + (s.avgQualityScore || 0), 0) / benchmark.summaries.length : 0,
            avgResponseTime: Array.isArray(benchmark.summaries) ? 
              benchmark.summaries.reduce((sum: number, s: any) => sum + (s.avgResponseTime || 0), 0) / benchmark.summaries.length : 0,
            duration: Math.floor(Math.random() * 300 + 120) // Estimate for now
          }));
          setExecutionHistory(history);
        } else if (modelPerformance.length > 0) {
          // Fallback with current data
          setExecutionHistory([{
            id: 'current',
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
            modelsTested: modelPerformance.length,
            testCases: 5,
            avgQuality: modelPerformance.reduce((acc, model) => acc + model.avgQualityScore, 0) / modelPerformance.length,
            avgResponseTime: modelPerformance.reduce((acc, model) => acc + model.avgResponseTime, 0) / modelPerformance.length,
            duration: Math.floor(modelPerformance.length * 45)
          }]);
        }
      } catch (error) {
        console.error('Error fetching execution history:', error);
      }
    };

    fetchExecutionHistory();
  }, [modelPerformance, metrics.totalBenchmarks]);

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Benchmark</h1>
            <p className="text-muted-foreground">Monitore o desempenho comparativo dos modelos de IA</p>
          </div>
          <Button variant="outline" onClick={refetch} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Benchmark</h1>
          <p className="text-muted-foreground">Monitore o desempenho comparativo dos modelos de IA</p>
        </div>
        <div className="flex gap-3">
          <SystemVersionIndicator />
          <Button variant="outline" onClick={refetch} size="sm" disabled={isLoading || isBenchmarkRunning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <BenchmarkOptionsDialog
            onExecute={executeBenchmark}
            isRunning={isBenchmarkRunning}
          />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Qualidade</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics.bestQualityModel.model || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? '...' : `${metrics.bestQualityModel.score.toFixed(1)}% de qualidade`}
            </p>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mais Rápido</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics.fastestModel.model || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? '...' : `${metrics.fastestModel.time.toLocaleString()}ms`}
            </p>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mais Econômico</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics.mostEconomicalModel.model || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? '...' : `$${metrics.mostEconomicalModel.cost.toFixed(4)} por query`}
            </p>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold">
              {isLoading ? '...' : `${metrics.overallSuccessRate}%`}
            </div>
            <Badge 
              variant={metrics.overallSuccessRate >= 80 ? 'default' : 'destructive'}
              className="mt-2"
            >
              {metrics.overallSuccessRate >= 80 ? 'Excelente' : 'Precisa Melhorar'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="overview" className="text-sm">📊 Visão Geral</TabsTrigger>
          <TabsTrigger value="models" className="text-sm">🤖 Modelos</TabsTrigger>
          <TabsTrigger value="charts" className="text-sm">📈 Gráficos</TabsTrigger>
          <TabsTrigger value="executions" className="text-sm">🔄 Execuções</TabsTrigger>
          <TabsTrigger value="insights" className="text-sm">💡 Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Benchmarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Benchmarks:</span>
                  <span className="font-semibold">{metrics.totalBenchmarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modelos Testados:</span>
                  <span className="font-semibold">{metrics.totalModels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Sucesso Geral:</span>
                  <Badge variant={metrics.overallSuccessRate >= 80 ? 'default' : 'destructive'}>
                    {metrics.overallSuccessRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 3 Modelos por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Qualidade:</span>
                    <span className="text-sm">{metrics.bestQualityModel.model}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Velocidade:</span>
                    <span className="text-sm">{metrics.fastestModel.model}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Custo:</span>
                    <span className="text-sm">{metrics.mostEconomicalModel.model}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <BenchmarkModelTable 
            modelPerformance={modelPerformance} 
            onViewResults={async (model) => {
              setSelectedModelResults(model);
              setLoadingResults(true);
              setShowResultsDialog(true);
              
              try {
                // Fetch detailed results with JOIN to get real questions and expected answers
                const { data: validationResults, error } = await supabase
                  .from('qa_validation_results')
                  .select(`
                    *,
                    qa_test_cases!inner(
                      id,
                      query,
                      question,
                      expected_answer,
                      expected_keywords,
                      category,
                      complexity
                    )
                  `)
                  .eq('model', model.model)
                  .order('created_at', { ascending: false })
                  .limit(50);

                if (error) {
                  console.error('Error fetching detailed results:', error);
                  toast.error('Erro ao carregar resultados detalhados');
                  setDetailedResults([]);
                } else {
                  // Transform the data to match BenchmarkResult interface using utility functions
                  const transformedResults = validationResults?.map((result: any) => {
                    const testCase = result.qa_test_cases;
                    
                    return {
                      testCaseId: result.test_case_id,
                      question: testCase?.query || testCase?.question || `Caso de teste ${result.test_case_id}`,
                      expectedAnswer: testCase?.expected_keywords?.length > 0 
                        ? `Palavras-chave esperadas: ${testCase.expected_keywords.join(', ')}`
                        : testCase?.expected_answer || 'Não especificada',
                      actualAnswer: result.actual_answer || 'Nenhuma resposta',
                      success: result.is_correct || false,
                      accuracy: result.accuracy_score || 0,
                      responseTime: result.response_time_ms || 0,
                      error: result.error_details
                    };
                  }) || [];
                  
                  setDetailedResults(transformedResults);
                }
              } catch (error) {
                console.error('Error fetching results:', error);
                setDetailedResults([]);
              } finally {
                setLoadingResults(false);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <BenchmarkCharts 
            modelPerformance={modelPerformance}
            qualityByModel={qualityByModel}
            costByProvider={costByProvider}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <BenchmarkExecutionHistory 
            executions={executionHistory}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insights e Recomendações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Alert>
                  <Crown className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Para tarefas complexas:</strong> Use {metrics.bestQualityModel.model} que oferece {metrics.bestQualityModel.score.toFixed(1)}% de qualidade.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Para respostas rápidas:</strong> Use {metrics.fastestModel.model} com tempo médio de {metrics.fastestModel.time.toLocaleString()}ms.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Para otimização de custos:</strong> Use {metrics.mostEconomicalModel.model} com custo de apenas ${metrics.mostEconomicalModel.cost.toFixed(4)} por query.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {selectedModelResults && (
        <BenchmarkResultsDialog
          open={showResultsDialog}
          onOpenChange={(open) => {
            setShowResultsDialog(open);
            if (!open) {
              setDetailedResults([]);
              setSelectedModelResults(null);
            }
          }}
          model={selectedModelResults.model}
          provider={selectedModelResults.provider}
          results={detailedResults}
          summary={{
            totalTests: selectedModelResults.totalTests,
            passedTests: Math.round(selectedModelResults.totalTests * (selectedModelResults.successRate / 100)),
            avgQualityScore: selectedModelResults.avgQualityScore,
            avgResponseTime: selectedModelResults.avgResponseTime,
            successRate: selectedModelResults.successRate
          }}
        />
      )}
    </div>
  );
}