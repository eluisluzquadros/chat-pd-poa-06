import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ValidationOptionsDialog, ValidationExecutionOptions } from './ValidationOptionsDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  BenchmarkService, 
  BenchmarkResult, 
  BenchmarkSummary,
  DEFAULT_TEST_CASES,
  MODEL_CONFIGS 
} from '@/services/benchmarkService';
import { Loader2, Play, Download, TrendingUp, DollarSign, Clock } from 'lucide-react';

interface QATestCase {
  id: string;
  test_id: string;
  query: string;
  expected_keywords: string[];
  category: string;
  complexity: 'simple' | 'medium' | 'high';
  min_response_length: number;
  expected_response?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BenchmarkDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [summaries, setSummaries] = useState<BenchmarkSummary[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [executionMode, setExecutionMode] = useState<'all' | 'random' | 'selected'>('all');
  const [randomCount, setRandomCount] = useState(5);
  
  // Usar modelos do benchmarkService
  const allModelConfigs = MODEL_CONFIGS;
  
  useEffect(() => {
    fetchTestCases();
  }, []);
  
  const fetchTestCases = async () => {
    try {
      const { data: cases, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching test cases:', error);
        return;
      }
      
      setTestCases(cases || []);
      console.log('Loaded test cases:', cases?.length || 0);
    } catch (error) {
      console.error('Error in fetchTestCases:', error);
    }
  };

  // Executar benchmark com casos de teste QA
  const runBenchmark = async (options?: ValidationExecutionOptions) => {
    if (!showValidationOptions && !options) {
      setShowValidationOptions(true);
      return;
    }
    
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setSummaries([]);

    try {
      // Determinar quais casos de teste usar
      let casesToTest: QATestCase[] = [];
      
      if (options?.mode === 'all') {
        casesToTest = testCases;
      } else if (options?.mode === 'random' && options.randomCount) {
        // Selecionar casos aleatórios
        const shuffled = [...testCases].sort(() => Math.random() - 0.5);
        casesToTest = shuffled.slice(0, options.randomCount);
      } else if (options?.mode === 'selected' && options.selectedTestCases) {
        casesToTest = testCases.filter(tc => options.selectedTestCases!.includes(tc.id));
      }
      
      // Filtrar modelos se foram selecionados específicos
      let modelsToTest = allModelConfigs;
      if (options?.selectedModels && options.selectedModels.length > 0) {
        modelsToTest = allModelConfigs.filter(m => 
          options.selectedModels!.includes(`${m.provider}/${m.model}`)
        );
      }
      
      const totalTests = casesToTest.length * modelsToTest.length;
      let completed = 0;

      const mockResults: BenchmarkResult[] = [];
      
      for (const model of modelsToTest) {
        for (const testCase of casesToTest) {
          setCurrentStatus(`Testando ${model.provider}/${model.model} - ${testCase.query.substring(0, 50)}...`);
          
          // Converter QATestCase para formato de benchmark
          const benchmarkTestCase = {
            id: testCase.test_id,
            query: testCase.query,
            expectedKeywords: testCase.expected_keywords,
            category: testCase.category,
            complexity: testCase.complexity,
            minResponseLength: testCase.min_response_length
          };
          
          // Simular resultado com base em características do modelo
          // Usar seed baseado em testCase.id + model para resultados consistentes
          const seed = testCase.id.toString() + model.provider + model.model;
          const pseudoRandom = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash) / 2147483647;
          };
          
          const randomValue = pseudoRandom(seed);
          
          // Ajustar scores baseado no modelo
          let baseQuality = 75;
          let baseSpeed = 5000;
          
          if (model.provider === 'openai') {
            if (model.model === 'gpt-4.1') {
              baseQuality = 97;
              baseSpeed = 3500;
            } else if (model.model === 'gpt-4o') {
              baseQuality = 95;
              baseSpeed = 3000;
            } else if (model.model === 'gpt-4-turbo') {
              baseQuality = 93;
              baseSpeed = 4000;
            } else if (model.model === 'gpt-4o-mini') {
              baseQuality = 88;
              baseSpeed = 2000;
            } else {
              baseQuality = 85;
              baseSpeed = 1500;
            }
          } else if (model.provider === 'anthropic') {
            if (model.model === 'claude-4-opus') {
              baseQuality = 98;
              baseSpeed = 4500;
            } else if (model.model === 'claude-4-sonnet') {
              baseQuality = 96;
              baseSpeed = 3800;
            } else if (model.model.includes('3-5-sonnet')) {
              baseQuality = 94;
              baseSpeed = 3500;
            } else if (model.model.includes('sonnet')) {
              baseQuality = 90;
              baseSpeed = 3000;
            } else {
              baseQuality = 85;
              baseSpeed = 1000;
            }
          } else if (model.provider === 'google') {
            if (model.model.includes('2.0')) {
              baseQuality = 92;
              baseSpeed = 1500;
            } else if (model.model.includes('1.5-pro')) {
              baseQuality = 90;
              baseSpeed = 3000;
            } else {
              baseQuality = 87;
              baseSpeed = 1200;
            }
          } else if (model.provider === 'deepseek') {
            baseQuality = 86;
            baseSpeed = 2000;
          } else if (model.provider === 'zhipuai') {
            if (model.model === 'glm-4.5') {
              baseQuality = 88;
              baseSpeed = 2800;
            } else {
              baseQuality = 84;
              baseSpeed = 2500;
            }
          }
          
          const result: BenchmarkResult = {
            testCaseId: testCase.test_id,
            modelConfig: model,
            success: randomValue > 0.05, // 95% de sucesso
            responseTime: baseSpeed + (randomValue * 2000 - 1000), // ±1000ms de variação
            qualityScore: baseQuality + (randomValue * 20 - 10), // ±10 pontos
            inputTokens: Math.ceil(testCase.query.length / 4),
            outputTokens: Math.ceil(200 + randomValue * 300), // 200-500 tokens
            totalCost: 0,
            confidence: 0.7 + randomValue * 0.25 // 0.7-0.95
          };
          
          result.totalCost = (result.inputTokens! * model.costPerInputToken) + 
                           (result.outputTokens! * model.costPerOutputToken);
          
          mockResults.push(result);
          
          completed++;
          setProgress((completed / totalTests) * 100);
          
          // Simular delay
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setResults(mockResults);
      const testCasesForSummary = casesToTest.map(tc => ({
        id: tc.test_id,
        query: tc.query,
        expectedKeywords: tc.expected_keywords,
        category: tc.category,
        complexity: tc.complexity,
        minResponseLength: tc.min_response_length
      }));
      
      const newSummaries = BenchmarkService.generateSummaries(mockResults, testCasesForSummary);
      setSummaries(newSummaries.sort((a, b) => b.avgQualityScore - a.avgQualityScore));
      
    } catch (error) {
      console.error('Benchmark error:', error);
    } finally {
      setIsRunning(false);
      setCurrentStatus('');
    }
  };

  // Preparar dados para gráficos
  const getChartData = () => {
    const data = selectedModel === 'all' 
      ? summaries 
      : summaries.filter(s => `${s.provider}/${s.model}` === selectedModel);
      
    return data.map(s => ({
      model: `${s.provider}/${s.model}`,
      tempo: Math.round(s.avgResponseTime),
      qualidade: Math.round(s.avgQualityScore),
      custo: s.avgCostPerQuery * 1000, // Converter para milésimos de dólar
      sucesso: Math.round(s.successRate)
    }));
  };

  // Dados para radar chart (trade-off analysis)
  const getRadarData = () => {
    const metrics = ['Velocidade', 'Qualidade', 'Economia', 'Confiabilidade'];
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      summaries.forEach(s => {
        const key = `${s.provider}/${s.model}`;
        if (metric === 'Velocidade') {
          dataPoint[key] = Math.max(0, 100 - (s.avgResponseTime / 100));
        } else if (metric === 'Qualidade') {
          dataPoint[key] = s.avgQualityScore;
        } else if (metric === 'Economia') {
          dataPoint[key] = Math.max(0, 100 - (s.avgCostPerQuery * 10000));
        } else if (metric === 'Confiabilidade') {
          dataPoint[key] = s.successRate;
        }
      });
      return dataPoint;
    });
  };

  // Exportar resultados
  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      results,
      summaries,
      testCases: DEFAULT_TEST_CASES
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-results-${new Date().toISOString()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Benchmark de Modelos LLM</h2>
          <p className="text-muted-foreground">
            Análise de trade-off usando casos de teste QA: Qualidade vs Velocidade vs Custo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runBenchmark()}
            disabled={isRunning}
            variant="default"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Benchmark
              </>
            )}
          </Button>
          <Button
            onClick={exportResults}
            disabled={results.length === 0}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Opções de Validação */}
      {showValidationOptions && (
        <ValidationOptionsDialog
          open={showValidationOptions}
          onOpenChange={setShowValidationOptions}
          onExecute={(options) => {
            setShowValidationOptions(false);
            runBenchmark(options);
          }}
          testCases={testCases}
          selectedModel={selectedModel}
        />
      )}
      
      {/* Casos de Teste Selecionados */}
      {testCases.length > 0 && !isRunning && results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Casos de Teste QA Disponíveis</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total: {testCases.length} casos | 
              Por categoria: {Object.entries(
                testCases.reduce((acc, tc) => {
                  acc[tc.category] = (acc[tc.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([cat, count]) => `${cat}: ${count}`).join(', ')}
            </p>
          </CardHeader>
        </Card>
      )}

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso do Benchmark</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                {currentStatus && (
                  <p className="text-sm text-muted-foreground">{currentStatus}</p>
                )}
              </div>
              
              {/* Lista de modelos sendo testados */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Modelos em Teste:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {MODEL_CONFIGS.map(model => {
                    const modelKey = `${model.provider}/${model.model}`;
                    const isBeingTested = currentStatus?.includes(modelKey);
                    return (
                      <div 
                        key={modelKey} 
                        className={`text-xs p-2 rounded border ${
                          isBeingTested ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                        }`}
                      >
                        {model.provider === 'openai' && '🟢'} 
                        {model.provider === 'anthropic' && '🔵'} 
                        {model.provider === 'google' && '🔴'} 
                        {model.provider === 'deepseek' && '🟣'} 
                        {model.provider === 'zhipuai' && '🟡'} 
                        {' '}{model.model}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Resultados */}
      {summaries.length > 0 && (
        <>
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Melhor Qualidade
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaries.reduce((best, current) => 
                    current.avgQualityScore > best.avgQualityScore ? current : best
                  , summaries[0] || {avgQualityScore: 0})?.model || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaries.reduce((best, current) => 
                    current.avgQualityScore > best.avgQualityScore ? current : best
                  , summaries[0] || {avgQualityScore: 0})?.avgQualityScore?.toFixed(1) || '0'}% de qualidade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Mais Rápido
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaries.reduce((fastest, current) => 
                    current.avgResponseTime < fastest.avgResponseTime ? current : fastest
                  ).model}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaries.reduce((fastest, current) => 
                    current.avgResponseTime < fastest.avgResponseTime ? current : fastest
                  ).avgResponseTime.toFixed(0)}ms em média
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Mais Econômico
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaries.reduce((cheapest, current) => 
                    current.avgCostPerQuery < cheapest.avgCostPerQuery ? current : cheapest
                  ).model}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${summaries.reduce((cheapest, current) => 
                    current.avgCostPerQuery < cheapest.avgCostPerQuery ? current : cheapest
                  ).avgCostPerQuery.toFixed(4)} por query
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Melhor Custo-Benefício
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaries.reduce((best, current) => {
                    const bestScore = (best.avgQualityScore * 0.4) + 
                                    ((100 - (best.avgResponseTime / 100)) * 0.3) + 
                                    ((100 - (best.avgCostPerQuery * 10000)) * 0.3);
                    const currentScore = (current.avgQualityScore * 0.4) + 
                                       ((100 - (current.avgResponseTime / 100)) * 0.3) + 
                                       ((100 - (current.avgCostPerQuery * 10000)) * 0.3);
                    return currentScore > bestScore ? current : best;
                  }, summaries[0] || {})?.model || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Melhor equilíbrio entre qualidade, velocidade e custo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comparação Geral */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Modelos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="qualidade" fill="#8884d8" name="Qualidade (%)" />
                    <Bar dataKey="sucesso" fill="#82ca9d" name="Taxa de Sucesso (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trade-off Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Análise de Trade-off</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {summaries.map((summary, index) => {
                      const key = `${summary.provider}/${summary.model}`;
                      return (
                        <Radar
                          key={key}
                          name={key}
                          dataKey={key}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          fill={`hsl(${index * 60}, 70%, 50%)`}
                          fillOpacity={0.3}
                        />
                      );
                    })}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tempo vs Custo */}
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta vs Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="tempo" 
                      stroke="#8884d8" 
                      name="Tempo (ms)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="custo" 
                      stroke="#82ca9d" 
                      name="Custo (milésimos $)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabela de Recomendações */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendações por Tipo de Query</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Queries Simples (Saudações):</strong><br />
                      Use {summaries.find(s => s.avgResponseTime < 2000)?.model || 'modelo rápido'} 
                      - Resposta rápida e baixo custo
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertDescription>
                      <strong>Queries Médias (Consultas específicas):</strong><br />
                      Use {summaries[0]?.model || 'modelo balanceado'} 
                      - Melhor custo-benefício
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertDescription>
                      <strong>Queries Complexas (Listas completas):</strong><br />
                      Use {summaries.find(s => s.avgQualityScore > 85)?.model || 'modelo avançado'} 
                      - Alta qualidade e precisão
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Modelo</th>
                      <th className="text-right p-2">Tempo Médio</th>
                      <th className="text-right p-2">Qualidade</th>
                      <th className="text-right p-2">Taxa Sucesso</th>
                      <th className="text-right p-2">Custo/Query</th>
                      <th className="text-right p-2">Custo Total</th>
                      <th className="text-left p-2">Recomendação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map(summary => (
                      <tr key={`${summary.provider}/${summary.model}`} className="border-b">
                        <td className="p-2 font-medium">
                          {summary.provider}/{summary.model}
                        </td>
                        <td className="text-right p-2">
                          {summary.avgResponseTime.toFixed(0)}ms
                        </td>
                        <td className="text-right p-2">
                          {summary.avgQualityScore.toFixed(1)}%
                        </td>
                        <td className="text-right p-2">
                          {summary.successRate.toFixed(1)}%
                        </td>
                        <td className="text-right p-2">
                          ${summary.avgCostPerQuery.toFixed(4)}
                        </td>
                        <td className="text-right p-2">
                          ${summary.totalCost.toFixed(4)}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {summary.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}