import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BenchmarkMetrics {
  totalBenchmarks: number;
  bestQualityModel: { model: string; score: number };
  fastestModel: { model: string; time: number };
  mostEconomicalModel: { model: string; cost: number };
  overallSuccessRate: number;
  totalModels: number;
}

export interface ModelPerformance {
  provider: string;
  model: string;
  avgQualityScore: number;
  avgResponseTime: number;
  avgCostPerQuery: number;
  successRate: number;
  totalTests: number;
  recommendation: string;
}

export interface BenchmarkData {
  metrics: BenchmarkMetrics;
  modelPerformance: ModelPerformance[];
  qualityByModel: Array<{ model: string; quality: number }>;
  costByProvider: Array<{ provider: string; cost: number; count: number }>;
  isLoading: boolean;
  error: string | null;
}

export function useBenchmark(): BenchmarkData & { 
  refetch: () => Promise<void>; 
  executeBenchmark: (options?: { models?: string[]; mode?: string; includeSQL?: boolean; excludeSQL?: boolean }) => Promise<void>; 
  runBenchmark: (options?: { models?: string[]; mode?: string; includeSQL?: boolean; excludeSQL?: boolean }) => Promise<void>;
  isBenchmarkRunning: boolean;
  isRunning: boolean;
  results: ModelPerformance[];
  summaries: ModelPerformance[];
} {
  const [data, setData] = useState<BenchmarkData>({
    metrics: {
      totalBenchmarks: 0,
      bestQualityModel: { model: '', score: 0 },
      fastestModel: { model: '', time: 0 },
      mostEconomicalModel: { model: '', cost: 0 },
      overallSuccessRate: 0,
      totalModels: 0
    },
    modelPerformance: [],
    qualityByModel: [],
    costByProvider: [],
    isLoading: true,
    error: null
  });

  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);

  const fetchBenchmarkData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch from qa_validation_runs table (primary source - same as quality dashboard)
      const { data: validationRuns, error: runsError } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (runsError) throw runsError;

      // Fetch from qa_benchmarks table (secondary source for compatibility)
      const { data: benchmarks, error: benchmarksError } = await supabase
        .from('qa_benchmarks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (benchmarksError) throw benchmarksError;

      if (!validationRuns?.length && !benchmarks?.length) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Nenhum benchmark encontrado. Execute um benchmark primeiro.'
        }));
        return;
      }

      // Process validation data from qa_validation_runs (primary source - same as quality dashboard)
      const modelPerformanceMap = new Map<string, ModelPerformance>();
      
      // Process validation runs first (preferred source - same data as quality dashboard)
      if (validationRuns?.length) {
        validationRuns.forEach(run => {
          if (run.model && run.status === 'completed') {
            // Extract provider from model name or default to 'unknown'
            const provider = run.model.includes('gpt') ? 'openai' :
                           run.model.includes('claude') ? 'anthropic' :
                           run.model.includes('gemini') ? 'google' :
                           run.model.includes('deepseek') ? 'deepseek' :
                           run.model.includes('glm') ? 'zhipuai' : 'unknown';
            
            const modelKey = `${provider}-${run.model}`;
            
            // Only use the latest run for each model
            if (!modelPerformanceMap.has(modelKey)) {
              modelPerformanceMap.set(modelKey, {
                provider,
                model: run.model,
                avgQualityScore: Math.round((run.overall_accuracy || 0) * 100),
                avgResponseTime: Math.round(run.avg_response_time_ms || 0),
                avgCostPerQuery: 0.001, // Placeholder
                successRate: Math.round(((run.passed_tests || 0) / (run.total_tests || 1)) * 100),
                totalTests: run.total_tests || 0,
                recommendation: (run.overall_accuracy || 0) >= 0.9 ? 'Excelente para tarefas complexas' :
                               (run.avg_response_time_ms || 0) <= 2000 ? 'Ótimo para respostas rápidas' :
                               'Balanceado para uso geral'
              });
            }
          }
        });
      }

      // Process from qa_benchmarks summaries if no validation data
      if (benchmarks?.length && modelPerformanceMap.size === 0) {
        benchmarks.forEach(benchmark => {
          if (benchmark.summaries && Array.isArray(benchmark.summaries)) {
            benchmark.summaries.forEach((summary: any) => {
              const modelKey = `${summary.provider || 'unknown'}-${summary.model || 'unknown'}`;
              if (!modelPerformanceMap.has(modelKey)) {
                modelPerformanceMap.set(modelKey, {
                  provider: summary.provider || 'unknown',
                  model: summary.model || 'unknown',
                  avgQualityScore: Math.round((summary.avgQualityScore || 0)),
                  avgResponseTime: Math.round(summary.avgResponseTime || 0),
                  avgCostPerQuery: Math.round((summary.avgCostPerQuery || 0) * 10000) / 10000,
                  successRate: Math.round(summary.successRate || 0),
                  totalTests: summary.totalTests || 0,
                  recommendation: summary.recommendation || ''
                });
              }
            });
          }
        });
      }

      const modelPerformance = Array.from(modelPerformanceMap.values())
        .filter(model => model.model !== 'Unknown')
        .sort((a, b) => b.avgQualityScore - a.avgQualityScore);

      // Calculate metrics
      const bestQuality = modelPerformance.length > 0 
        ? { model: modelPerformance[0].model, score: modelPerformance[0].avgQualityScore }
        : { model: 'N/A', score: 0 };

      const fastestModel = modelPerformance.length > 0
        ? modelPerformance.reduce((fastest, current) => 
            current.avgResponseTime < fastest.avgResponseTime ? current : fastest
          )
        : { model: 'N/A', avgResponseTime: 0 };

      const mostEconomical = modelPerformance.length > 0
        ? modelPerformance.reduce((cheapest, current) => 
            current.avgCostPerQuery < cheapest.avgCostPerQuery ? current : cheapest
          )
        : { model: 'N/A', avgCostPerQuery: 0 };

      const overallSuccessRate = modelPerformance.length > 0
        ? Math.min(100, Math.round(modelPerformance.reduce((sum, model) => sum + model.successRate, 0) / modelPerformance.length))
        : 0;

      // Prepare chart data
      const qualityByModel = modelPerformance
        .slice(0, 10)
        .map(model => ({
          model: model.model,
          quality: model.avgQualityScore
        }));

      const costByProvider = Object.values(
        modelPerformance.reduce((acc, model) => {
          if (!acc[model.provider]) {
            acc[model.provider] = { provider: model.provider, cost: 0, count: 0 };
          }
          acc[model.provider].cost += model.avgCostPerQuery;
          acc[model.provider].count += 1;
          return acc;
        }, {} as Record<string, { provider: string; cost: number; count: number }>)
      ).map(item => ({
        ...item,
        cost: Math.round((item.cost / item.count) * 10000) / 10000
      }));

      setData({
        metrics: {
          totalBenchmarks: validationRuns?.length || benchmarks?.length || 0,
          bestQualityModel: bestQuality,
          fastestModel: { model: fastestModel.model, time: fastestModel.avgResponseTime },
          mostEconomicalModel: { model: mostEconomical.model, cost: mostEconomical.avgCostPerQuery },
          overallSuccessRate,
          totalModels: modelPerformance.length
        },
        modelPerformance,
        qualityByModel,
        costByProvider,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching benchmark data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar dados de benchmark'
      }));
    }
  };

  useEffect(() => {
    fetchBenchmarkData();
  }, []);

  const runBenchmark = async (options?: { models?: string[]; mode?: string; includeSQL?: boolean; excludeSQL?: boolean }) => {
    setIsBenchmarkRunning(true);
    
    try {
      // Use the same endpoint selection logic as chat
      const useAgenticRAGv2 = localStorage.getItem('useAgenticRAGv2') !== 'false';
      const endpoint = useAgenticRAGv2 ? 'qa-benchmark-unified' : 'run-benchmark';
      
      const requestData = {
        mode: options?.mode || 'all',
        includeSQL: options?.includeSQL ?? true,
        excludeSQL: options?.excludeSQL ?? false,
        ...(options?.models && { models: options.models })
      };

      console.log(`🚀 BENCHMARK: Executing with ${endpoint} and data:`, requestData);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: requestData
      });

      if (error) {
        console.error('Benchmark execution error:', error);
        
        // Enhanced error handling for different error types
        if (error.message.includes('Failed to send a request to the Edge Function')) {
          toast.error('Erro de conexão: Verifique se as Edge Functions estão funcionando');
        } else if (error.message.includes('500')) {
          toast.error('Erro interno do servidor: Alguns modelos podem estar indisponíveis');
        } else if (error.message.includes('timeout')) {
          toast.error('Timeout: O benchmark está demorando mais que o esperado');
        } else {
          toast.error(`Erro ao executar benchmark: ${error.message}`);
        }
        return;
      }

      if (data?.success) {
        const successCount = data.summary?.successfulModels || 0;
        const totalCount = data.summary?.totalModels || 0;
        const failedCount = data.summary?.failedModels || 0;
        
        if (failedCount > 0) {
          toast.success(`Benchmark concluído: ${successCount}/${totalCount} modelos executados com sucesso`);
          toast.warning(`${failedCount} modelo(s) falharam - verifique os logs para detalhes`);
        } else {
          toast.success(`Benchmark executado com sucesso! ${successCount} modelos testados`);
        }
        
        // Add longer delay to ensure all data is properly saved
        setTimeout(() => {
          fetchBenchmarkData();
        }, 3000);
      } else {
        console.error('Benchmark failed:', data);
        const errorMsg = data?.error || data?.errors?.join(', ') || 'Erro desconhecido';
        toast.error(`Falha no benchmark: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error executing benchmark:', error);
      toast.error('Erro ao conectar com o servidor de benchmark');
    } finally {
      setIsBenchmarkRunning(false);
    }
  };

  return {
    ...data,
    refetch: fetchBenchmarkData,
    executeBenchmark: runBenchmark,
    runBenchmark,
    isBenchmarkRunning,
    isRunning: isBenchmarkRunning,
    results: data.modelPerformance,
    summaries: data.modelPerformance
  };
}