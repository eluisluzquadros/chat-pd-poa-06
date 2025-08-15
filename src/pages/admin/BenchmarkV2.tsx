import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, Play, Crown, Zap, DollarSign, 
  TrendingUp, AlertCircle, BarChart3, Settings,
  Trophy, Target, Activity
} from 'lucide-react';
import { SystemVersionIndicator } from '@/components/admin/SystemVersionIndicator';
import { toast } from 'sonner';
import { unifiedRAGService } from '@/lib/unifiedRAGService';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';

interface BenchmarkMetrics {
  totalBenchmarks: number;
  bestQualityModel: { model: string; score: number };
  fastestModel: { model: string; time: number };
  mostEconomicalModel: { model: string; cost: number };
  overallSuccessRate: number;
  totalModels: number;
}

interface ModelPerformance {
  provider: string;
  model: string;
  displayName: string;
  avgQualityScore: number;
  avgResponseTime: number;
  avgCostPerQuery: number;
  successRate: number;
  totalTests: number;
  recommendation: string;
  trend: 'up' | 'down' | 'stable';
}

interface BenchmarkProgress {
  isRunning: boolean;
  currentModel: string;
  currentModelIndex: number;
  totalModels: number;
  currentTest: number;
  totalTests: number;
  percentage: number;
  status: string;
  startTime: number;
  estimatedTimeRemaining: number;
}

export default function BenchmarkV2() {
  const [metrics, setMetrics] = useState<BenchmarkMetrics>({
    totalBenchmarks: 0,
    bestQualityModel: { model: 'N/A', score: 0 },
    fastestModel: { model: 'N/A', time: 0 },
    mostEconomicalModel: { model: 'N/A', cost: 0 },
    overallSuccessRate: 0,
    totalModels: 0
  });

  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [benchmarkProgress, setBenchmarkProgress] = useState<BenchmarkProgress>({
    isRunning: false,
    currentModel: '',
    currentModelIndex: 0,
    totalModels: 0,
    currentTest: 0,
    totalTests: 0,
    percentage: 0,
    status: '',
    startTime: 0,
    estimatedTimeRemaining: 0
  });

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [benchmarkHistory, setBenchmarkHistory] = useState<any[]>([]);

  // Benchmark configuration
  const [benchmarkConfig, setBenchmarkConfig] = useState({
    models: [] as string[],
    mode: 'sample' as 'all' | 'sample' | 'categories',
    sampleSize: 10,
    categories: [] as string[],
    includeSQL: true
  });

  const availableModels = UPDATED_MODEL_CONFIGS
    .filter(config => config.available)
    .map(config => ({
      value: config.model,
      label: config.displayName,
      provider: config.provider,
      cost: config.costPerOutputToken
    }));

  // Fetch benchmark data
  const fetchBenchmarkData = async () => {
    try {
      setIsLoading(true);

      // Get validation runs for benchmark data
      const { data: runs } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(100);

      // Get benchmark history
      const { data: benchmarks } = await supabase
        .from('qa_benchmarks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      setBenchmarkHistory(benchmarks || []);

      if (!runs?.length) {
        setIsLoading(false);
        return;
      }

      // Process model performance
      const modelMap = new Map<string, any>();
      
      runs.forEach(run => {
        if (!run.model) return;
        
        if (!modelMap.has(run.model)) {
          const config = UPDATED_MODEL_CONFIGS.find(c => 
            c.model === run.model || 
            `${c.provider}/${c.model}` === run.model
          );
          
          modelMap.set(run.model, {
            provider: config?.provider || 'unknown',
            model: run.model,
            displayName: config?.displayName || run.model,
            runs: [],
            totalQuality: 0,
            totalTime: 0,
            totalTests: 0,
            passedTests: 0
          });
        }
        
        const modelData = modelMap.get(run.model);
        modelData.runs.push(run);
        modelData.totalQuality += (run.overall_accuracy || 0);
        modelData.totalTime += (run.avg_response_time_ms || 0);
        modelData.totalTests += (run.total_tests || 0);
        modelData.passedTests += (run.passed_tests || 0);
      });

      // Calculate performance metrics
      const performance: ModelPerformance[] = Array.from(modelMap.values()).map(data => {
        const avgQuality = data.runs.length > 0 ? data.totalQuality / data.runs.length : 0;
        const avgTime = data.runs.length > 0 ? data.totalTime / data.runs.length : 0;
        const successRate = data.totalTests > 0 ? data.passedTests / data.totalTests : 0;
        
        // Determine trend based on recent runs
        const recentRuns = data.runs.slice(0, 3);
        const olderRuns = data.runs.slice(3, 6);
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        if (recentRuns.length > 0 && olderRuns.length > 0) {
          const recentAvg = recentRuns.reduce((sum: number, r: any) => sum + (r.overall_accuracy || 0), 0) / recentRuns.length;
          const olderAvg = olderRuns.reduce((sum: number, r: any) => sum + (r.overall_accuracy || 0), 0) / olderRuns.length;
          
          if (recentAvg > olderAvg + 0.05) trend = 'up';
          else if (recentAvg < olderAvg - 0.05) trend = 'down';
        }
        
        // Generate recommendation
        let recommendation = '';
        if (avgQuality >= 0.9) {
          recommendation = 'Excelente para tarefas complexas';
        } else if (avgTime <= 2000) {
          recommendation = 'Ótimo para respostas rápidas';
        } else if (avgQuality >= 0.7 && avgTime <= 5000) {
          recommendation = 'Balanceado para uso geral';
        } else {
          recommendation = 'Adequado para tarefas simples';
        }
        
        return {
          provider: data.provider,
          model: data.model,
          displayName: data.displayName,
          avgQualityScore: Math.round(avgQuality * 100),
          avgResponseTime: Math.round(avgTime),
          avgCostPerQuery: 0.001, // Placeholder - would need real calculation
          successRate: Math.round(successRate * 100),
          totalTests: data.totalTests,
          recommendation,
          trend
        };
      }).sort((a, b) => b.avgQualityScore - a.avgQualityScore);

      setModelPerformance(performance);

      // Calculate metrics
      if (performance.length > 0) {
        const bestQuality = performance[0];
        const fastest = performance.reduce((min, curr) => 
          curr.avgResponseTime < min.avgResponseTime ? curr : min
        );
        const cheapest = performance.reduce((min, curr) => 
          curr.avgCostPerQuery < min.avgCostPerQuery ? curr : min
        );
        const avgSuccess = performance.reduce((sum, m) => sum + m.successRate, 0) / performance.length;

        setMetrics({
          totalBenchmarks: benchmarks?.length || 0,
          bestQualityModel: { model: bestQuality.displayName, score: bestQuality.avgQualityScore },
          fastestModel: { model: fastest.displayName, time: fastest.avgResponseTime },
          mostEconomicalModel: { model: cheapest.displayName, cost: cheapest.avgCostPerQuery },
          overallSuccessRate: Math.round(avgSuccess),
          totalModels: performance.length
        });
      }

    } catch (error) {
      console.error('Error fetching benchmark data:', error);
      toast.error('Erro ao carregar dados de benchmark');
    } finally {
      setIsLoading(false);
    }
  };

  // Run benchmark
  const runBenchmark = async () => {
    if (benchmarkConfig.models.length === 0) {
      toast.error('Selecione pelo menos um modelo');
      return;
    }

    try {
      const startTime = Date.now();
      setBenchmarkProgress({
        isRunning: true,
        currentModel: benchmarkConfig.models[0],
        currentModelIndex: 0,
        totalModels: benchmarkConfig.models.length,
        currentTest: 0,
        totalTests: benchmarkConfig.mode === 'all' ? 121 : benchmarkConfig.sampleSize,
        percentage: 0,
        status: 'Iniciando benchmark...',
        startTime,
        estimatedTimeRemaining: 0
      });

      // Get test cases
      let query = supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true);

      if (benchmarkConfig.mode === 'sample') {
        query = query.limit(benchmarkConfig.sampleSize);
      } else if (benchmarkConfig.mode === 'categories' && benchmarkConfig.categories.length > 0) {
        query = query.in('category', benchmarkConfig.categories);
      }

      if (!benchmarkConfig.includeSQL) {
        query = query.eq('is_sql_related', false);
      }

      const { data: testCases } = await query;

      if (!testCases?.length) {
        throw new Error('Nenhum caso de teste encontrado');
      }

      const results: any[] = [];

      // Test each model
      for (let modelIdx = 0; modelIdx < benchmarkConfig.models.length; modelIdx++) {
        const model = benchmarkConfig.models[modelIdx];
        
        setBenchmarkProgress(prev => ({
          ...prev,
          currentModel: model,
          currentModelIndex: modelIdx,
          status: `Testando modelo ${modelIdx + 1} de ${benchmarkConfig.models.length}: ${model}`
        }));

        // Create validation run
        const { data: run } = await supabase
          .from('qa_validation_runs')
          .insert({
            model,
            total_tests: testCases.length,
            passed_tests: 0,
            overall_accuracy: 0,
            status: 'running',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!run) continue;

        let passed = 0;
        let totalAccuracy = 0;
        let totalResponseTime = 0;

        // Test each case
        for (let testIdx = 0; testIdx < testCases.length; testIdx++) {
          const testCase = testCases[testIdx];
          
          const overallProgress = (modelIdx * testCases.length + testIdx + 1) / 
                                 (benchmarkConfig.models.length * testCases.length);
          
          const elapsed = Date.now() - startTime;
          const estimatedTotal = elapsed / overallProgress;
          const estimatedRemaining = estimatedTotal - elapsed;
          
          setBenchmarkProgress(prev => ({
            ...prev,
            currentTest: testIdx + 1,
            percentage: Math.round(overallProgress * 100),
            estimatedTimeRemaining: Math.round(estimatedRemaining / 1000),
            status: `Modelo ${model}: Teste ${testIdx + 1}/${testCases.length}`
          }));

          try {
            const startTestTime = Date.now();
            const result = await unifiedRAGService.testQuery(
              testCase.query || testCase.question,
              model
            );
            const responseTime = Date.now() - startTestTime;

            const isCorrect = evaluateAnswer(result.response, testCase);
            const accuracy = calculateAccuracy(result.response, testCase);

            if (isCorrect) passed++;
            totalAccuracy += accuracy;
            totalResponseTime += responseTime;

            await supabase
              .from('qa_validation_results')
              .insert({
                test_case_id: testCase.id.toString(),
                validation_run_id: run.id,
                model,
                actual_answer: result.response?.substring(0, 2000),
                is_correct: isCorrect,
                accuracy_score: accuracy,
                response_time_ms: responseTime
              });

          } catch (error) {
            console.error(`Error testing case ${testCase.id}:`, error);
          }
        }

        // Update run
        await supabase
          .from('qa_validation_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            passed_tests: passed,
            overall_accuracy: totalAccuracy / testCases.length,
            avg_response_time_ms: Math.round(totalResponseTime / testCases.length)
          })
          .eq('id', run.id);

        results.push({
          model,
          passed,
          total: testCases.length,
          accuracy: totalAccuracy / testCases.length,
          avgResponseTime: totalResponseTime / testCases.length
        });
      }

      // Save benchmark summary
      await supabase
        .from('qa_benchmarks')
        .insert({
          results: {},
          summaries: results.map(r => ({
            model: r.model,
            provider: getProviderFromModel(r.model),
            avgQualityScore: Math.round(r.accuracy * 100),
            avgResponseTime: Math.round(r.avgResponseTime),
            successRate: Math.round((r.passed / r.total) * 100),
            totalTests: r.total
          })),
          metadata: {
            mode: benchmarkConfig.mode,
            totalModels: benchmarkConfig.models.length,
            totalTests: testCases.length
          }
        });

      toast.success('Benchmark concluído com sucesso!');
      setShowConfigDialog(false);
      setBenchmarkProgress(prev => ({ ...prev, isRunning: false }));
      fetchBenchmarkData();

    } catch (error) {
      console.error('Benchmark error:', error);
      toast.error(`Erro no benchmark: ${error.message}`);
      setBenchmarkProgress(prev => ({ ...prev, isRunning: false }));
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

  const getProviderFromModel = (model: string): string => {
    if (model.includes('gpt')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gemini')) return 'google';
    if (model.includes('deepseek')) return 'deepseek';
    if (model.includes('mixtral') || model.includes('llama')) return 'groq';
    return 'unknown';
  };

  useEffect(() => {
    fetchBenchmarkData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Benchmark</h1>
          <p className="text-muted-foreground mt-1">
            Compare o desempenho dos modelos de IA
          </p>
        </div>
        <div className="flex gap-3">
          <SystemVersionIndicator />
          <Button 
            variant="outline" 
            onClick={fetchBenchmarkData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={() => setShowConfigDialog(true)}
            disabled={benchmarkProgress.isRunning}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Benchmark
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {benchmarkProgress.isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{benchmarkProgress.status}</span>
                <span>{benchmarkProgress.percentage}%</span>
              </div>
              <Progress value={benchmarkProgress.percentage} />
              <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  <span>Modelo:</span>
                  <p className="font-medium">{benchmarkProgress.currentModel}</p>
                </div>
                <div>
                  <span>Progresso:</span>
                  <p className="font-medium">
                    {benchmarkProgress.currentModelIndex + 1}/{benchmarkProgress.totalModels} modelos,
                    {benchmarkProgress.currentTest}/{benchmarkProgress.totalTests} testes
                  </p>
                </div>
                <div>
                  <span>Tempo restante:</span>
                  <p className="font-medium">
                    ~{Math.floor(benchmarkProgress.estimatedTimeRemaining / 60)}m {benchmarkProgress.estimatedTimeRemaining % 60}s
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Qualidade</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{metrics.bestQualityModel.model}</div>
            <p className="text-sm text-muted-foreground">
              {metrics.bestQualityModel.score}% de acurácia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Rápido</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{metrics.fastestModel.model}</div>
            <p className="text-sm text-muted-foreground">
              {metrics.fastestModel.time}ms em média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Econômico</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{metrics.mostEconomicalModel.model}</div>
            <p className="text-sm text-muted-foreground">
              ${metrics.mostEconomicalModel.cost.toFixed(4)}/query
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overallSuccessRate}%</div>
            <p className="text-sm text-muted-foreground">
              {metrics.totalModels} modelos testados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Modelos por Qualidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {modelPerformance.slice(0, 5).map((model, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <span className="text-sm font-medium">{model.displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={model.avgQualityScore >= 80 ? "default" : "secondary"}>
                          {model.avgQualityScore}%
                        </Badge>
                        {model.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {model.trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights e Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <Crown className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Para máxima qualidade:</strong> Use {metrics.bestQualityModel.model}
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Para respostas rápidas:</strong> Use {metrics.fastestModel.model}
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Para economia:</strong> Use {metrics.mostEconomicalModel.model}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Performance Detalhada dos Modelos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelPerformance.map((model, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {model.displayName}
                          <Badge variant="outline">{model.provider}</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {model.recommendation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        {model.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {model.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Qualidade</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={model.avgQualityScore} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{model.avgQualityScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Velocidade</p>
                        <p className="text-sm font-medium mt-1">{model.avgResponseTime}ms</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                        <p className="text-sm font-medium mt-1">{model.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Testes Realizados</p>
                        <p className="text-sm font-medium mt-1">{model.totalTests}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {modelPerformance.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum modelo testado ainda. Execute um benchmark para ver os resultados.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Comparação Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Qualidade vs Velocidade</h4>
                  <div className="space-y-2">
                    {modelPerformance.slice(0, 8).map((model, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm w-32 truncate">{model.displayName}</span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <Progress value={model.avgQualityScore} className="h-2 flex-1" />
                            <span className="text-xs w-10 text-right">{model.avgQualityScore}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-muted-foreground" />
                            <Progress value={100 - (model.avgResponseTime / 100)} className="h-2 flex-1" />
                            <span className="text-xs w-14 text-right">{model.avgResponseTime}ms</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {benchmarkHistory.map((benchmark, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(benchmark.timestamp).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(benchmark.timestamp).toLocaleTimeString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {benchmark.metadata?.totalModels || 0} modelos • {benchmark.metadata?.totalTests || 0} testes
                        </p>
                      </div>
                      <Badge variant="outline">
                        {benchmark.metadata?.mode || 'all'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {benchmarkHistory.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum benchmark executado ainda.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Benchmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modo de Execução</Label>
              <Select 
                value={benchmarkConfig.mode} 
                onValueChange={(value: any) => setBenchmarkConfig(prev => ({ ...prev, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os casos (121)</SelectItem>
                  <SelectItem value="sample">Amostra</SelectItem>
                  <SelectItem value="categories">Por categorias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {benchmarkConfig.mode === 'sample' && (
              <div>
                <Label>Tamanho da Amostra</Label>
                <Select 
                  value={benchmarkConfig.sampleSize.toString()} 
                  onValueChange={(value) => setBenchmarkConfig(prev => ({ ...prev, sampleSize: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 casos</SelectItem>
                    <SelectItem value="10">10 casos</SelectItem>
                    <SelectItem value="20">20 casos</SelectItem>
                    <SelectItem value="50">50 casos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Selecionar Modelos</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto">
                {availableModels.map(model => (
                  <div key={model.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={benchmarkConfig.models.includes(model.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBenchmarkConfig(prev => ({
                            ...prev,
                            models: [...prev.models, model.value]
                          }));
                        } else {
                          setBenchmarkConfig(prev => ({
                            ...prev,
                            models: prev.models.filter(m => m !== model.value)
                          }));
                        }
                      }}
                    />
                    <Label className="text-sm cursor-pointer">
                      {model.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={benchmarkConfig.includeSQL}
                onCheckedChange={(checked) => 
                  setBenchmarkConfig(prev => ({ ...prev, includeSQL: checked as boolean }))
                }
              />
              <Label>Incluir casos SQL</Label>
            </div>

            <div className="flex justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {benchmarkConfig.models.length} modelo(s) selecionado(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={runBenchmark} disabled={benchmarkConfig.models.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Benchmark
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}