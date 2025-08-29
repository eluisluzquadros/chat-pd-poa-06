import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Clock, DollarSign, Award } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line
} from "recharts";

interface ModelMetrics {
  model: string;
  accuracy: number;
  avgResponseTime: number;
  totalTests: number;
  passedTests: number;
  costPerTest: number;
  categoryPerformance: Record<string, number>;
}

interface ComparisonData {
  metric: string;
  [key: string]: any; // Dynamic model names
}

export function QAModelComparison() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(['agentic-rag', 'claude-chat']);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const availableModels = [
    'agentic-rag', 'claude-chat', 'gemini-chat', 
    'llama-chat', 'deepseek-chat', 'groq-chat'
  ];

  const modelCosts: Record<string, number> = {
    'agentic-rag': 0.00015, // gpt-4o-mini
    'claude-chat': 0.003,
    'gemini-chat': 0.0001,
    'llama-chat': 0.0001,
    'deepseek-chat': 0.00014,
    'groq-chat': 0.00005
  };

  useEffect(() => {
    loadModelComparison();
  }, [selectedModels]);

  const loadModelComparison = async () => {
    try {
      // Get validation runs for selected models with error handling
      const { data: runs, error: runsError } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .in('model', selectedModels)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (runsError) {
        console.error('Error fetching validation runs:', runsError);
        setModelMetrics([]);
        setComparisonData([]);
        setRadarData([]);
        return;
      }

      if (!runs || runs.length === 0) {
        // No data available for comparison
        setModelMetrics([]);
        setComparisonData([]);
        setRadarData([]);
        return;
      }

      // Get detailed results for each model
      const metrics: ModelMetrics[] = [];
      
      for (const model of selectedModels) {
        try {
          const modelRuns = runs.filter(r => r.model === model);
          if (modelRuns.length === 0) continue;

          // Get the most recent run for this model
          const latestRun = modelRuns[0];
          
          // Get category performance with separate query due to RLS issues
          const { data: resultData } = await supabase
            .from('qa_validation_results')
            .select('is_correct, test_case_id')
            .eq('validation_run_id', latestRun.id);
          
          const { data: testCaseData } = await supabase
            .from('qa_test_cases')
            .select('id, category');

          const categoryPerformance: Record<string, number> = {};
          
          if (resultData && testCaseData) {
            const categoryGroups: Record<string, { total: number; correct: number }> = {};
            
            resultData.forEach(result => {
              const testCase = testCaseData.find(tc => tc.id.toString() === result.test_case_id);
              const category = testCase?.category || 'unknown';
              
              if (!categoryGroups[category]) {
                categoryGroups[category] = { total: 0, correct: 0 };
              }
              categoryGroups[category].total++;
              if (result.is_correct) {
                categoryGroups[category].correct++;
              }
            });

            Object.entries(categoryGroups).forEach(([category, stats]) => {
              categoryPerformance[category] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            });
          }

          metrics.push({
            model: model,
            accuracy: (latestRun.overall_accuracy || 0) * 100,
            avgResponseTime: latestRun.avg_response_time_ms || 0,
            totalTests: latestRun.total_tests || 0,
            passedTests: latestRun.passed_tests || 0,
            costPerTest: modelCosts[model] || 0.001,
            categoryPerformance
          });
        } catch (modelError) {
          console.error(`Error processing model ${model}:`, modelError);
          // Continue with other models even if one fails
        }
      }

      setModelMetrics(metrics);
      prepareComparisonData(metrics);
      prepareRadarData(metrics);
    } catch (error) {
      console.error('Critical error loading model comparison:', error);
      // Set empty data to prevent crashes
      setModelMetrics([]);
      setComparisonData([]);
      setRadarData([]);
    } finally {
      setLoading(false);
    }
  };

  const prepareComparisonData = (metrics: ModelMetrics[]) => {
    const data: ComparisonData[] = [
      {
        metric: 'Acurácia (%)',
        ...metrics.reduce((acc, m) => ({ ...acc, [m.model]: m.accuracy }), {})
      },
      {
        metric: 'Tempo Resposta (ms)',
        ...metrics.reduce((acc, m) => ({ ...acc, [m.model]: m.avgResponseTime }), {})
      },
      {
        metric: 'Custo por Teste ($)',
        ...metrics.reduce((acc, m) => ({ ...acc, [m.model]: m.costPerTest * 1000 }), {}) // x1000 for visibility
      }
    ];
    setComparisonData(data);
  };

  const prepareRadarData = (metrics: ModelMetrics[]) => {
    if (metrics.length === 0) return;
    
    const categories = Object.keys(metrics[0].categoryPerformance);
    const data = categories.map(category => {
      const point: any = { category };
      metrics.forEach(m => {
        point[m.model] = m.categoryPerformance[category] || 0;
      });
      return point;
    });
    setRadarData(data);
  };

  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      'agentic-rag': '#3b82f6',
      'claude-chat': '#8b5cf6',
      'gemini-chat': '#10b981',
      'llama-chat': '#f59e0b',
      'deepseek-chat': '#ef4444',
      'groq-chat': '#ec4899'
    };
    return colors[model] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-[300px] bg-muted rounded animate-pulse"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show message when no model data is available
  if (modelMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Comparação entre Modelos</h3>
          <Select
            value={selectedModels.join(',')}
            onValueChange={(value) => setSelectedModels(value.split(','))}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione modelos para comparar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agentic-rag,claude-chat">RAG vs Claude</SelectItem>
              <SelectItem value="agentic-rag,gemini-chat">RAG vs Gemini</SelectItem>
              <SelectItem value="agentic-rag,llama-chat,deepseek-chat">RAG vs Llama vs DeepSeek</SelectItem>
              <SelectItem value={availableModels.join(',')}>Todos os Modelos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h4 className="text-lg font-medium">Nenhum dado de comparação disponível</h4>
                <p className="text-muted-foreground">
                  Não há validações concluídas para os modelos selecionados: {selectedModels.join(', ')}.
                  Execute validações para gerar dados de comparação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Comparação entre Modelos</h3>
          <Select
            value={selectedModels.join(',')}
            onValueChange={(value) => setSelectedModels(value.split(','))}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione modelos para comparar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agentic-rag,claude-chat">
                RAG vs Claude
              </SelectItem>
              <SelectItem value="agentic-rag,gemini-chat">
                RAG vs Gemini
              </SelectItem>
              <SelectItem value="agentic-rag,llama-chat,deepseek-chat">
                RAG vs Llama vs DeepSeek
              </SelectItem>
              <SelectItem value={availableModels.join(',')}>
                Todos os Modelos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {modelMetrics.map(model => (
            <Card key={model.model}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {model.model}
                  </CardTitle>
                  <Badge 
                    style={{ backgroundColor: getModelColor(model.model) }}
                    className="text-white"
                  >
                    {model.accuracy.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Acertos</span>
                    <span className="font-medium">
                      {model.passedTests}/{model.totalTests}
                    </span>
                  </div>
                  <Progress value={model.accuracy} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {model.avgResponseTime}ms
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${(model.costPerTest * model.totalTests).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bar Chart Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparação de Métricas</CardTitle>
              <CardDescription>Acurácia, tempo e custo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedModels.map(model => (
                      <Bar 
                        key={model}
                        dataKey={model} 
                        fill={getModelColor(model)}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart for Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por Categoria</CardTitle>
              <CardDescription>Acurácia em diferentes tipos de perguntas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {selectedModels.map(model => (
                      <Radar
                        key={model}
                        name={model}
                        dataKey={model}
                        stroke={getModelColor(model)}
                        fill={getModelColor(model)}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best Model Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Recomendação de Modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modelMetrics.length > 0 && (
                <>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">Melhor Acurácia</Badge>
                    <p className="text-sm">
                      <strong>{modelMetrics.sort((a, b) => b.accuracy - a.accuracy)[0].model}</strong> com {modelMetrics[0].accuracy.toFixed(1)}% de acurácia
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Melhor Custo-Benefício</Badge>
                    <p className="text-sm">
                      {(() => {
                        const sorted = [...modelMetrics].sort((a, b) => 
                          (b.accuracy / (b.costPerTest * 100)) - (a.accuracy / (a.costPerTest * 100))
                        );
                        return (
                          <>
                            <strong>{sorted[0].model}</strong> oferece o melhor equilíbrio entre 
                            acurácia ({sorted[0].accuracy.toFixed(1)}%) e custo 
                            (${sorted[0].costPerTest.toFixed(4)}/teste)
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5">Mais Rápido</Badge>
                    <p className="text-sm">
                      <strong>{modelMetrics.sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0].model}</strong> com 
                      tempo médio de {modelMetrics[0].avgResponseTime}ms
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}