import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function BenchmarkDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [summaries, setSummaries] = useState<BenchmarkSummary[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [currentStatus, setCurrentStatus] = useState<string>('');

  // Executar benchmark
  const runBenchmark = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setSummaries([]);

    try {
      // Simular progresso
      const totalTests = DEFAULT_TEST_CASES.length * MODEL_CONFIGS.length;
      let completed = 0;

      // Por enquanto, vamos simular os resultados
      // Em produção, isso chamaria o BenchmarkService.runFullBenchmark()
      const mockResults: BenchmarkResult[] = [];
      
      for (const model of MODEL_CONFIGS) {
        for (const testCase of DEFAULT_TEST_CASES) {
          setCurrentStatus(`Testando ${model.provider}/${model.model} - ${testCase.id}`);
          
          // Simular resultado
          const result: BenchmarkResult = {
            testCaseId: testCase.id,
            modelConfig: model,
            success: Math.random() > 0.1,
            responseTime: Math.random() * 10000 + 1000,
            qualityScore: Math.random() * 40 + 60,
            inputTokens: Math.ceil(testCase.query.length / 4),
            outputTokens: Math.ceil(Math.random() * 1000 + 100),
            totalCost: 0,
            confidence: Math.random() * 0.3 + 0.7
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
      const newSummaries = BenchmarkService.generateSummaries(mockResults, DEFAULT_TEST_CASES);
      setSummaries(newSummaries);
      
    } catch (error) {
      console.error('Benchmark error:', error);
    } finally {
      setIsRunning(false);
      setCurrentStatus('');
    }
  };

  // Preparar dados para gráficos
  const getChartData = () => {
    if (selectedModel === 'all') {
      return summaries.map(s => ({
        model: `${s.provider}/${s.model}`,
        tempo: Math.round(s.avgResponseTime),
        qualidade: Math.round(s.avgQualityScore),
        custo: s.avgCostPerQuery * 1000, // Converter para milésimos de dólar
        sucesso: Math.round(s.successRate)
      }));
    } else {
      const filtered = summaries.filter(s => `${s.provider}/${s.model}` === selectedModel);
      return filtered.map(s => ({
        model: `${s.provider}/${s.model}`,
        tempo: Math.round(s.avgResponseTime),
        qualidade: Math.round(s.avgQualityScore),
        custo: s.avgCostPerQuery * 1000,
        sucesso: Math.round(s.successRate)
      }));
    }
  };

  // Dados para radar chart (trade-off analysis)
  const getRadarData = () => {
    return summaries.map(s => ({
      model: s.model,
      velocidade: Math.max(0, 100 - (s.avgResponseTime / 100)), // Inverter escala
      qualidade: s.avgQualityScore,
      economia: Math.max(0, 100 - (s.avgCostPerQuery * 10000)), // Inverter e escalar
      confiabilidade: s.successRate
    }));
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
            Análise de trade-off: Qualidade vs Velocidade vs Custo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runBenchmark}
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

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
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
                  {summaries[0]?.model || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaries[0]?.avgQualityScore.toFixed(1)}% de qualidade
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
                  {summaries[0]?.model || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaries[0]?.recommendation}
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
                    <PolarAngleAxis dataKey="model" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {getRadarData().map((entry, index) => (
                      <Radar
                        key={entry.model}
                        name={entry.model}
                        dataKey={(data: any) => data.model === entry.model ? [
                          data.velocidade,
                          data.qualidade,
                          data.economia,
                          data.confiabilidade
                        ] : []}
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        fill={`hsl(${index * 60}, 70%, 50%)`}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Tooltip />
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