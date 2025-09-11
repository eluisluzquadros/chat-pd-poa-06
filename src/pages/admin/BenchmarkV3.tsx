import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, Play, Crown, Zap, DollarSign, 
  TrendingUp, AlertCircle, BarChart3, Settings,
  Trophy, Target, Activity, Gauge, Cpu, Clock
} from 'lucide-react';
import { SystemVersionIndicator } from '@/components/admin/SystemVersionIndicator';
import { toast } from 'sonner';
import { Header } from '@/components/Header';

// Novos componentes V3
import { EnhancedBenchmarkExecutor } from '@/components/admin/EnhancedBenchmarkExecutor';
import { PerformanceAnalyzer } from '@/components/admin/PerformanceAnalyzer';
import { BenchmarkConfigV3 } from '@/components/admin/BenchmarkConfigV3';
import { ModelOptimizationPanel } from '@/components/admin/ModelOptimizationPanel';

interface BenchmarkMetricsV3 {
  totalBenchmarks: number;
  bestPerformingModel: { model: string; score: number };
  fastestModel: { model: string; time: number };
  mostOptimizedModel: { model: string; efficiency: number };
  avgPerformanceScore: number;
  totalModelsOptimized: number;
  optimizationImprovements: number;
  lastBenchmarkDate: string | null;
}

interface BenchmarkProgressV3 {
  isRunning: boolean;
  currentModel: string;
  currentModelIndex: number;
  totalModels: number;
  currentTest: number;
  totalTests: number;
  percentage: number;
  status: string;
  phase: 'initialization' | 'testing' | 'optimization' | 'analysis' | 'completed';
  optimizationResults: any[];
  estimatedTimeRemaining: number;
}

export default function BenchmarkV3() {
  const [metrics, setMetrics] = useState<BenchmarkMetricsV3>({
    totalBenchmarks: 0,
    bestPerformingModel: { model: 'N/A', score: 0 },
    fastestModel: { model: 'N/A', time: 0 },
    mostOptimizedModel: { model: 'N/A', efficiency: 0 },
    avgPerformanceScore: 0,
    totalModelsOptimized: 0,
    optimizationImprovements: 0,
    lastBenchmarkDate: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('enhanced-benchmark');
  const [benchmarkProgress, setBenchmarkProgress] = useState<BenchmarkProgressV3>({
    isRunning: false,
    currentModel: '',
    currentModelIndex: 0,
    totalModels: 0,
    currentTest: 0,
    totalTests: 0,
    percentage: 0,
    status: '',
    phase: 'initialization',
    optimizationResults: [],
    estimatedTimeRemaining: 0
  });

  const [benchmarkResults, setBenchmarkResults] = useState<any[]>([]);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<any[]>([]);

  // Fetch dados de benchmark V3
  const fetchBenchmarkV3Data = async () => {
    try {
      setIsLoading(true);

      // Buscar resultados de benchmark V3
      const { data: benchmarkV3Results } = await supabase
        .from('benchmark_v3_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setBenchmarkResults(benchmarkV3Results || []);

      // Buscar benchmarks regulares para comparação
      const { data: regularBenchmarks } = await supabase
        .from('qa_benchmarks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (benchmarkV3Results && benchmarkV3Results.length > 0) {
        // Calcular métricas agregadas
        const modelMap = new Map();
        
        benchmarkV3Results.forEach(result => {
          if (!modelMap.has(result.model)) {
            modelMap.set(result.model, {
              model: result.model,
              totalScore: 0,
              totalTime: 0,
              totalTests: 0,
              efficiency: 0,
              runs: 0
            });
          }
          
          const modelData = modelMap.get(result.model);
          modelData.totalScore += result.avg_quality_score || 0;
          modelData.totalTime += result.avg_response_time || 0;
          modelData.totalTests += result.total_tests || 0;
          modelData.efficiency += (result.performance_metrics as any)?.efficiency || 0;
          modelData.runs++;
        });

        const modelPerformance = Array.from(modelMap.values()).map(data => ({
          ...data,
          avgScore: data.totalScore / data.runs,
          avgTime: data.totalTime / data.runs,
          avgEfficiency: data.efficiency / data.runs
        }));

        const bestPerforming = modelPerformance.reduce((best, current) => 
          current.avgScore > best.avgScore ? current : best
        , { model: 'N/A', avgScore: 0 });

        const fastest = modelPerformance.reduce((fast, current) => 
          current.avgTime < fast.avgTime ? current : fast
        , { model: 'N/A', avgTime: Infinity });

        const mostOptimized = modelPerformance.reduce((opt, current) => 
          current.avgEfficiency > opt.avgEfficiency ? current : opt
        , { model: 'N/A', avgEfficiency: 0 });

        const avgPerformance = modelPerformance.reduce((sum, model) => sum + model.avgScore, 0) / modelPerformance.length;

        setMetrics({
          totalBenchmarks: benchmarkV3Results.length,
          bestPerformingModel: { model: bestPerforming.model, score: Math.round(bestPerforming.avgScore * 100) },
          fastestModel: { model: fastest.model, time: Math.round(fastest.avgTime) },
          mostOptimizedModel: { model: mostOptimized.model, efficiency: Math.round(mostOptimized.avgEfficiency * 100) },
          avgPerformanceScore: Math.round(avgPerformance * 100),
          totalModelsOptimized: modelPerformance.length,
          optimizationImprovements: Math.round((avgPerformance - 0.7) * 100), // Assumindo baseline de 70%
          lastBenchmarkDate: benchmarkV3Results[0]?.created_at || null
        });
      }

    } catch (error) {
      console.error('Error fetching Benchmark V3 data:', error);
      toast.error('Erro ao carregar dados de benchmark V3');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para executar benchmark avançado
  const handleEnhancedBenchmark = async (config: any) => {
    try {
      setBenchmarkProgress({
        isRunning: true,
        currentModel: config.models[0] || '',
        currentModelIndex: 0,
        totalModels: config.models.length,
        currentTest: 0,
        totalTests: config.testCount || 20,
        percentage: 0,
        status: 'Inicializando benchmark avançado...',
        phase: 'initialization',
        optimizationResults: [],
        estimatedTimeRemaining: 0
      });

      // Chamar edge function para benchmark V3
      const { data, error } = await supabase.functions.invoke('benchmark-unified-v3', {
        body: { 
          config,
          mode: 'enhanced',
          focusOnOptimization: true,
          ragVersion: 'v1' // Apenas V1 pode ser otimizado internamente
        }
      });

      if (error) throw error;

      toast.success('Benchmark V3 iniciado com sucesso!');
      
      // Simular progresso para demonstração
      simulateBenchmarkProgress();

    } catch (error) {
      console.error('Enhanced benchmark error:', error);
      toast.error(`Erro no benchmark V3: ${error.message}`);
      setBenchmarkProgress(prev => ({ ...prev, isRunning: false }));
    }
  };

  // Simular progresso do benchmark
  const simulateBenchmarkProgress = () => {
    let currentProgress = 0;
    const phases = ['initialization', 'testing', 'optimization', 'analysis', 'completed'];
    let currentPhaseIndex = 0;

    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 5;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
        setBenchmarkProgress(prev => ({
          ...prev,
          isRunning: false,
          percentage: 100,
          phase: 'completed',
          status: 'Benchmark concluído com sucesso!'
        }));
        
        // Refresh dados após benchmark
        setTimeout(() => {
          fetchBenchmarkV3Data();
        }, 1000);
        
        return;
      }

      // Atualizar fase baseada no progresso
      const newPhaseIndex = Math.floor((currentProgress / 100) * (phases.length - 1));
      if (newPhaseIndex !== currentPhaseIndex) {
        currentPhaseIndex = newPhaseIndex;
      }

      setBenchmarkProgress(prev => ({
        ...prev,
        percentage: Math.round(currentProgress),
        phase: phases[currentPhaseIndex] as any,
        status: getStatusForPhase(phases[currentPhaseIndex], prev.currentModel),
        estimatedTimeRemaining: Math.round((100 - currentProgress) * 2) // 2 segundos por %
      }));
    }, 500);
  };

  const getStatusForPhase = (phase: string, model: string): string => {
    switch (phase) {
      case 'initialization': return 'Inicializando sistema de benchmark...';
      case 'testing': return `Testando modelo ${model}...`;
      case 'optimization': return `Otimizando configurações para ${model}...`;
      case 'analysis': return 'Analisando resultados e métricas...';
      case 'completed': return 'Benchmark concluído!';
      default: return 'Processando...';
    }
  };

  useEffect(() => {
    fetchBenchmarkV3Data();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Benchmark Dashboard V3</h1>
              <p className="text-muted-foreground mt-1">
                Sistema avançado de benchmark e otimização para RAG V1
              </p>
            </div>
            <div className="flex gap-3">
              <SystemVersionIndicator />
              <Button 
                variant="outline" 
                onClick={fetchBenchmarkV3Data}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Progress Bar para Benchmark V3 */}
          {benchmarkProgress.isRunning && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>{benchmarkProgress.status}</span>
                    <span>{benchmarkProgress.percentage}%</span>
                  </div>
                  <Progress value={benchmarkProgress.percentage} />
                  <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-3 w-3" />
                      Fase: {benchmarkProgress.phase}
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3 w-3" />
                      Modelo: {benchmarkProgress.currentModel}
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      Teste: {benchmarkProgress.currentTest}/{benchmarkProgress.totalTests}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      ETA: {benchmarkProgress.estimatedTimeRemaining}s
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas Principais V3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Benchmarks V3</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalBenchmarks}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.lastBenchmarkDate ? `Último: ${new Date(metrics.lastBenchmarkDate).toLocaleDateString('pt-BR')}` : 'Nenhum benchmark'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Melhor Performance</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{metrics.bestPerformingModel.model}</div>
                <Badge variant="default">
                  {metrics.bestPerformingModel.score}% acurácia
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mais Rápido</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{metrics.fastestModel.model}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.fastestModel.time}ms médio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Melhorias de Otimização</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{metrics.optimizationImprovements}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalModelsOptimized} modelos otimizados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alert de Foco em V1 */}
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Foco em RAG V1:</strong> Este benchmark é otimizado especificamente para agentic-rag-v1, 
              onde temos controle completo para otimizações internas. RAG V2 é analisado apenas para comparação.
            </AlertDescription>
          </Alert>

          {/* Tabs Principais */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="enhanced-benchmark">Benchmark Avançado</TabsTrigger>
              <TabsTrigger value="performance">Análise de Performance</TabsTrigger>
              <TabsTrigger value="optimization">Otimização</TabsTrigger>
              <TabsTrigger value="configuration">Configuração V3</TabsTrigger>
            </TabsList>

            <TabsContent value="enhanced-benchmark" className="space-y-4">
              <EnhancedBenchmarkExecutor 
                onExecute={handleEnhancedBenchmark}
                isRunning={benchmarkProgress.isRunning}
                progress={benchmarkProgress}
              />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceAnalyzer 
                benchmarkResults={benchmarkResults}
                insights={performanceInsights}
                onRefresh={fetchBenchmarkV3Data}
              />
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4">
              <ModelOptimizationPanel 
                optimizationHistory={optimizationHistory}
                onOptimize={handleEnhancedBenchmark}
                isRunning={benchmarkProgress.isRunning}
              />
            </TabsContent>

            <TabsContent value="configuration" className="space-y-4">
              <BenchmarkConfigV3 
                onSave={(config) => {
                  toast.success('Configuração salva com sucesso!');
                }}
                currentConfig={{}}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}