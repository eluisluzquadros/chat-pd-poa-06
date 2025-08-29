import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { unifiedRAGService } from '@/lib/unifiedRAGService';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { 
  Play, Pause, Trophy, Zap, DollarSign, TrendingUp,
  AlertCircle, BarChart3, Clock, Target, Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface ModelResult {
  model: string;
  displayName: string;
  provider: string;
  accuracy: number;
  avgResponseTime: number;
  costPerQuery: number;
  successRate: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: number;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface BenchmarkProgress {
  isRunning: boolean;
  currentModel: string;
  currentModelIndex: number;
  totalModels: number;
  currentTest: number;
  totalTests: number;
  overallProgress: number;
  estimatedTimeRemaining: number;
}

export function AgenticRAGBenchmark() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [testSampleSize, setTestSampleSize] = useState<number>(10);
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);
  const [benchmarkProgress, setBenchmarkProgress] = useState<BenchmarkProgress>({
    isRunning: false,
    currentModel: '',
    currentModelIndex: 0,
    totalModels: 0,
    currentTest: 0,
    totalTests: 0,
    overallProgress: 0,
    estimatedTimeRemaining: 0
  });
  const [testCases, setTestCases] = useState<any[]>([]);

  // Available models from config
  const availableModels = UPDATED_MODEL_CONFIGS
    .filter(config => config.available)
    .map(config => ({
      model: config.model,
      displayName: config.displayName,
      provider: config.provider,
      costPerToken: config.costPerOutputToken || 0
    }));

  // Load test cases
  const loadTestCases = async () => {
    try {
      const { data, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .limit(testSampleSize)
        .order('category');

      if (error) throw error;
      
      setTestCases(data || []);
      toast.success(`Carregados ${data?.length || 0} casos de teste`);
    } catch (error) {
      console.error('Error loading test cases:', error);
      toast.error('Erro ao carregar casos de teste');
    }
  };

  // Toggle model selection
  const toggleModel = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        return prev.filter(m => m !== model);
      }
      return [...prev, model];
    });
  };

  // Select all models from a provider
  const selectProviderModels = (provider: string) => {
    const providerModels = availableModels
      .filter(m => m.provider === provider)
      .map(m => m.model);
    
    setSelectedModels(prev => {
      const newModels = [...prev];
      providerModels.forEach(model => {
        if (!newModels.includes(model)) {
          newModels.push(model);
        }
      });
      return newModels;
    });
  };

  // Run benchmark
  const runBenchmark = async () => {
    if (selectedModels.length === 0) {
      toast.error('Selecione pelo menos um modelo');
      return;
    }

    if (testCases.length === 0) {
      await loadTestCases();
      if (testCases.length === 0) {
        toast.error('Nenhum caso de teste disponível');
        return;
      }
    }

    const startTime = Date.now();
    setBenchmarkProgress({
      isRunning: true,
      currentModel: selectedModels[0],
      currentModelIndex: 0,
      totalModels: selectedModels.length,
      currentTest: 0,
      totalTests: testCases.length,
      overallProgress: 0,
      estimatedTimeRemaining: 0
    });

    // Initialize results
    const results: ModelResult[] = selectedModels.map(model => {
      const config = availableModels.find(m => m.model === model);
      return {
        model,
        displayName: config?.displayName || model,
        provider: config?.provider || 'unknown',
        accuracy: 0,
        avgResponseTime: 0,
        costPerQuery: (config?.costPerToken || 0) * 1000, // Estimate 1000 tokens per query
        successRate: 0,
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: 0,
        errors: 0,
        status: 'pending'
      };
    });
    setModelResults(results);

    // Test each model
    for (let modelIdx = 0; modelIdx < selectedModels.length; modelIdx++) {
      const model = selectedModels[modelIdx];
      
      // Update status to running
      setModelResults(prev => prev.map(r => 
        r.model === model ? { ...r, status: 'running' } : r
      ));

      let passedTests = 0;
      let totalResponseTime = 0;
      let errors = 0;
      let totalAccuracy = 0;

      // Test each case
      for (let testIdx = 0; testIdx < testCases.length; testIdx++) {
        const testCase = testCases[testIdx];
        
        // Update progress
        const totalCompleted = modelIdx * testCases.length + testIdx;
        const totalToRun = selectedModels.length * testCases.length;
        const overallProgress = (totalCompleted / totalToRun) * 100;
        
        const elapsed = Date.now() - startTime;
        const estimatedTotal = totalCompleted > 0 ? (elapsed / totalCompleted) * totalToRun : 0;
        const estimatedRemaining = estimatedTotal - elapsed;

        setBenchmarkProgress({
          isRunning: true,
          currentModel: model,
          currentModelIndex: modelIdx,
          totalModels: selectedModels.length,
          currentTest: testIdx + 1,
          totalTests: testCases.length,
          overallProgress,
          estimatedTimeRemaining: Math.max(0, estimatedRemaining)
        });

        try {
          const testStart = Date.now();
          
          // Call agentic-rag with specific model
          const result = await unifiedRAGService.testQuery(
            testCase.query || testCase.question,
            model
          );
          
          const responseTime = Date.now() - testStart;
          totalResponseTime += responseTime;

          // Evaluate response
          if (testCase.expected_keywords && testCase.expected_keywords.length > 0) {
            const normalizedResponse = (result.response || '').toLowerCase();
            const matchedKeywords = testCase.expected_keywords.filter((keyword: string) =>
              normalizedResponse.includes(keyword.toLowerCase())
            );
            const accuracy = matchedKeywords.length / testCase.expected_keywords.length;
            totalAccuracy += accuracy;
            
            if (accuracy >= 0.6) {
              passedTests++;
            }
          } else {
            // If no expected keywords, just check if response exists
            if (result.response && result.response.length > 50) {
              passedTests++;
              totalAccuracy += 1;
            }
          }

        } catch (error) {
          console.error(`Error testing ${model} on case ${testIdx}:`, error);
          errors++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update model results
      const avgAccuracy = testCases.length > 0 ? totalAccuracy / testCases.length : 0;
      const avgResponseTime = testCases.length > 0 ? totalResponseTime / testCases.length : 0;
      const successRate = testCases.length > 0 ? passedTests / testCases.length : 0;

      setModelResults(prev => prev.map(r => 
        r.model === model ? {
          ...r,
          accuracy: avgAccuracy * 100,
          avgResponseTime,
          successRate: successRate * 100,
          passedTests,
          failedTests: testCases.length - passedTests - errors,
          errors,
          status: 'completed'
        } : r
      ));
    }

    // Save benchmark results
    try {
      const benchmarkData = {
        timestamp: new Date().toISOString(),
        models: selectedModels,
        totalTests: testCases.length,
        results: modelResults,
        metadata: {
          testSampleSize,
          totalTime: Date.now() - startTime
        }
      };

      await supabase
        .from('qa_benchmarks')
        .insert({
          results: benchmarkData.results,
          summaries: benchmarkData.results.map(r => ({
            model: r.model,
            provider: r.provider,
            avgQualityScore: Math.round(r.accuracy),
            avgResponseTime: Math.round(r.avgResponseTime),
            successRate: Math.round(r.successRate),
            totalTests: r.totalTests
          })),
          metadata: benchmarkData.metadata
        });

      toast.success('Benchmark concluído e salvo!');
    } catch (error) {
      console.error('Error saving benchmark:', error);
      toast.error('Erro ao salvar resultados');
    }

    setBenchmarkProgress(prev => ({ ...prev, isRunning: false }));
  };

  // Get best models by metric
  const getBestModels = () => {
    if (modelResults.length === 0) return null;

    const completed = modelResults.filter(r => r.status === 'completed');
    if (completed.length === 0) return null;

    const bestAccuracy = completed.reduce((best, curr) => 
      curr.accuracy > best.accuracy ? curr : best
    );
    
    const fastestModel = completed.reduce((best, curr) => 
      curr.avgResponseTime < best.avgResponseTime ? curr : best
    );
    
    const cheapestModel = completed.reduce((best, curr) => 
      curr.costPerQuery < best.costPerQuery ? curr : best
    );

    return { bestAccuracy, fastestModel, cheapestModel };
  };

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  useEffect(() => {
    loadTestCases();
  }, [testSampleSize]);

  const bestModels = getBestModels();

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Benchmark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tamanho da Amostra de Teste</Label>
            <select 
              className="w-full mt-1 p-2 border rounded"
              value={testSampleSize}
              onChange={(e) => setTestSampleSize(Number(e.target.value))}
              disabled={benchmarkProgress.isRunning}
            >
              <option value={5}>5 casos (rápido)</option>
              <option value={10}>10 casos (balanceado)</option>
              <option value={20}>20 casos (completo)</option>
              <option value={50}>50 casos (extensivo)</option>
              <option value={121}>121 casos (todos)</option>
            </select>
          </div>

          <div>
            <Label>Selecionar Modelos para Benchmark</Label>
            <div className="mt-2 space-y-4">
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{provider}</h4>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => selectProviderModels(provider)}
                      disabled={benchmarkProgress.isRunning}
                    >
                      Selecionar Todos
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {models.map(model => (
                      <div key={model.model} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedModels.includes(model.model)}
                          onCheckedChange={() => toggleModel(model.model)}
                          disabled={benchmarkProgress.isRunning}
                        />
                        <Label className="text-sm cursor-pointer">
                          {model.displayName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {selectedModels.length} modelo(s) selecionado(s) • {testCases.length} casos carregados
            </div>
            <Button 
              onClick={runBenchmark}
              disabled={benchmarkProgress.isRunning || selectedModels.length === 0}
            >
              {benchmarkProgress.isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Benchmark
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {benchmarkProgress.isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>
                  Modelo {benchmarkProgress.currentModelIndex + 1}/{benchmarkProgress.totalModels}: {benchmarkProgress.currentModel}
                </span>
                <span>{benchmarkProgress.overallProgress.toFixed(1)}%</span>
              </div>
              <Progress value={benchmarkProgress.overallProgress} />
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span>Teste atual:</span>
                  <p className="font-medium">
                    {benchmarkProgress.currentTest}/{benchmarkProgress.totalTests}
                  </p>
                </div>
                <div>
                  <span>Tempo restante:</span>
                  <p className="font-medium">
                    ~{Math.floor(benchmarkProgress.estimatedTimeRemaining / 60000)}m {Math.floor((benchmarkProgress.estimatedTimeRemaining % 60000) / 1000)}s
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Models Summary */}
      {bestModels && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Melhor Precisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestModels.bestAccuracy.displayName}</div>
              <Badge variant="default" className="mt-1">
                {bestModels.bestAccuracy.accuracy.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Mais Rápido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestModels.fastestModel.displayName}</div>
              <Badge variant="secondary" className="mt-1">
                {(bestModels.fastestModel.avgResponseTime / 1000).toFixed(1)}s
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Mais Econômico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestModels.cheapestModel.displayName}</div>
              <Badge variant="outline" className="mt-1">
                ${bestModels.cheapestModel.costPerQuery.toFixed(4)}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {modelResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Benchmark</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {modelResults
                  .sort((a, b) => b.accuracy - a.accuracy)
                  .map((result, idx) => (
                    <div key={result.model} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{idx + 1}</Badge>
                            <h4 className="font-medium">{result.displayName}</h4>
                            <Badge variant="secondary">{result.provider}</Badge>
                            {result.status === 'running' && (
                              <Badge variant="default" className="animate-pulse">
                                Testando...
                              </Badge>
                            )}
                            {result.status === 'completed' && result.accuracy >= 95 && (
                              <Badge variant="default">Meta Atingida!</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.status === 'completed' ? 'Concluído' : 
                           result.status === 'running' ? 'Em execução' : 
                           result.status === 'error' ? 'Erro' : 'Aguardando'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Precisão</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={result.accuracy} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{result.accuracy.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                          <p className="text-sm font-medium mt-1">
                            {result.passedTests}/{result.totalTests} ({result.successRate.toFixed(0)}%)
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">Tempo Médio</p>
                          <p className="text-sm font-medium mt-1">
                            {(result.avgResponseTime / 1000).toFixed(1)}s
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">Custo/Query</p>
                          <p className="text-sm font-medium mt-1">
                            ${result.costPerQuery.toFixed(4)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">Erros</p>
                          <p className="text-sm font-medium mt-1">
                            {result.errors > 0 ? (
                              <span className="text-red-600">{result.errors}</span>
                            ) : (
                              <span className="text-green-600">0</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {modelResults.length === 0 && !benchmarkProgress.isRunning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione modelos e execute o benchmark para comparar o desempenho entre diferentes provedores de LLM.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}