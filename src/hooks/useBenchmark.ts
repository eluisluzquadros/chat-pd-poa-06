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

export function useBenchmark(): BenchmarkData & { refetch: () => Promise<void>; executeBenchmark: (options?: { models?: string[] }) => Promise<void>; isBenchmarkRunning: boolean } {
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

      // Fetch from qa_benchmarks table
      const { data: benchmarks, error: benchmarksError } = await supabase
        .from('qa_benchmarks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (benchmarksError) throw benchmarksError;

      // Fetch from benchmark_analysis table
      const { data: analysis, error: analysisError } = await supabase
        .from('benchmark_analysis')
        .select('*')
        .order('timestamp', { ascending: false });

      if (analysisError) throw analysisError;

      if (!benchmarks?.length && !analysis?.length) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Nenhum benchmark encontrado. Execute um benchmark primeiro.'
        }));
        return;
      }

      // Process benchmark data
      const modelPerformanceMap = new Map<string, ModelPerformance>();
      
      // Process from analysis table first (preferred source)
      if (analysis?.length) {
        analysis.forEach(item => {
          const modelKey = `${item.provider}-${item.model}`;
          modelPerformanceMap.set(modelKey, {
            provider: item.provider || 'Unknown',
            model: item.model || 'Unknown',
            avgQualityScore: Math.round((item.avg_quality_score || 0) * 100) / 100,
            avgResponseTime: Math.round(item.avg_response_time || 0),
            avgCostPerQuery: Math.round((item.avg_cost_per_query || 0) * 10000) / 10000,
            successRate: Math.min(100, Math.round((item.success_rate || 0) * 100)),
            totalTests: 0,
            recommendation: item.recommendation || ''
          });
        });
      }

      // Process from qa_benchmarks summaries if no analysis data
      if (benchmarks?.length && modelPerformanceMap.size === 0) {
        benchmarks.forEach(benchmark => {
          if (benchmark.summaries && Array.isArray(benchmark.summaries)) {
            benchmark.summaries.forEach((summary: any) => {
              const modelKey = `${summary.provider || 'Unknown'}-${summary.model || 'Unknown'}`;
              if (!modelPerformanceMap.has(modelKey)) {
                modelPerformanceMap.set(modelKey, {
                  provider: summary.provider || 'Unknown',
                  model: summary.model || 'Unknown',
                  avgQualityScore: Math.round((summary.avgQualityScore || 0) * 100) / 100,
                  avgResponseTime: Math.round(summary.avgResponseTime || 0),
                  avgCostPerQuery: Math.round((summary.avgCostPerQuery || 0) * 10000) / 10000,
                  successRate: Math.min(100, Math.round((summary.successRate || 0) * 100)),
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
          totalBenchmarks: benchmarks?.length || 0,
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

  const executeBenchmark = async (options?: { models?: string[] }) => {
    setIsBenchmarkRunning(true);
    
    // Show initial feedback
    toast.info(`Iniciando benchmark com ${options?.models?.length || 0} modelos...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('run-benchmark', {
        body: { 
          models: options?.models || ['gpt-4o-mini-2024-07-18', 'claude-3-5-sonnet-20241022', 'gemini-1.5-flash-002']
        }
      });
      
      if (error) {
        console.error('Benchmark execution error:', error);
        toast.error(error.message || "Falha ao executar o benchmark");
      } else {
        const modelsCount = data?.modelsCount || options?.models?.length || 3;
        const testCasesCount = data?.testCasesCount || 5;
        
        toast.success(`Benchmark executado com sucesso! ${modelsCount} modelos testados com ${testCasesCount} casos de teste`);
        
        // Force refresh data after benchmark completion with a small delay
        setTimeout(async () => {
          await fetchBenchmarkData();
          toast.success("Dashboard atualizado com novos resultados!");
        }, 1000);
      }
    } catch (error) {
      console.error('Error executing benchmark:', error);
      toast.error("Falha na comunicação com o servidor");
    } finally {
      setIsBenchmarkRunning(false);
    }
  };

  return {
    ...data,
    refetch: fetchBenchmarkData,
    executeBenchmark,
    isBenchmarkRunning
  };
}