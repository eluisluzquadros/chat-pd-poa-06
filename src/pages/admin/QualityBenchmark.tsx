import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAgents } from '@/hooks/useAgents';
import { 
  ClipboardList, 
  Eye, 
  History, 
  Brain,
  Target,
  Clock,
  TrendingUp,
  Play,
  CheckCircle,
  RefreshCw,
  Tag,
  Database,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { TestCaseManager } from '@/components/admin/TestCaseManager';
import { TestExecutionDialog } from '@/components/admin/TestExecutionDialog';
import { QAExecutionHistory } from '@/components/admin/QAExecutionHistory';
import { useQuery } from '@tanstack/react-query';
import { useQAValidator } from '@/hooks/useQAValidator';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function QualityBenchmark() {
  const [activeTab, setActiveTab] = useState("test-cases");
  const [isLoading, setIsLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const { agents, loading: agentsLoading } = useAgents();
  const { runValidation, isRunning, progress } = useQAValidator();

  // Query para casos de teste
  const { data: testCases, refetch: refetchTestCases } = useQuery({
    queryKey: ['qa-test-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query para execuções
  const { data: executions, refetch: refetchExecutions } = useQuery({
    queryKey: ['qa-validation-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query para resultados detalhados (para análise cognitiva)
  const { data: results } = useQuery({
    queryKey: ['qa-validation-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (
            id,
            question,
            query,
            expected_answer,
            category
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query para métricas gerais
  const { data: metrics } = useQuery({
    queryKey: ['quality-benchmark-metrics'],
    queryFn: async () => {
      if (!testCases || !executions) return null;

      const totalTestCases = testCases.length;
      const totalExecutions = executions.length;
      const lastExecution = executions[0];
      
      // KPIs principais
      const bestQuality = executions.reduce((max, exec) => 
        Math.max(max, exec.overall_accuracy || 0), 0
      );
      
      const avgResponseTime = executions.reduce((sum, exec) => 
        sum + (exec.avg_response_time_ms || 0), 0
      ) / (executions.length || 1);
      
      const avgCost = 0.05; // Simulado - seria calculado baseado em custos reais
      const successRate = lastExecution?.overall_accuracy || 0;

      return {
        totalTestCases,
        totalExecutions,
        bestQuality,
        avgResponseTime: avgResponseTime / 1000, // Convert to seconds
        avgCost,
        successRate,
        insights: Math.floor((totalExecutions / Math.max(totalTestCases, 1)) * 47) // Simulado: % execuções vs casos x fator cognitivo
      };
    },
    enabled: !!testCases && !!executions
  });

  // Cálculos de KPIs específicos de casos de teste
  const testCaseKPIs = useMemo(() => {
    if (!testCases) return { total: 0, active: 0, categories: 0, sqlRelated: 0 };
    
    return {
      total: testCases.length,
      active: testCases.filter(t => t.is_active).length,
      categories: new Set(testCases.map(t => t.category).filter(Boolean)).size,
      sqlRelated: testCases.filter(t => t.is_sql_related).length
    };
  }, [testCases]);

  // Cálculos de KPIs específicos de execuções
  const executionKPIs = useMemo(() => {
    if (!executions || executions.length === 0) {
      return { total: 0, bestAccuracy: 0, avgTime: 0, running: 0, failureRate: 0 };
    }
    
    const runningCount = executions.filter(e => e.status === 'running').length;
    const failedCount = executions.filter(e => e.status === 'failed').length;
    const completedExecs = executions.filter(e => e.status === 'completed');
    
    const bestAccuracy = completedExecs.reduce((max, exec) => 
      Math.max(max, (exec.overall_accuracy || 0) * 100), 0
    );
    
    const avgTime = completedExecs.reduce((sum, exec) => 
      sum + (exec.avg_response_time_ms || 0), 0
    ) / (completedExecs.length || 1) / 1000;
    
    const failureRate = executions.length > 0 
      ? (failedCount / executions.length) * 100 
      : 0;
    
    return {
      total: executions.length,
      bestAccuracy: bestAccuracy.toFixed(1),
      avgTime: avgTime.toFixed(1),
      running: runningCount,
      failureRate: failureRate.toFixed(1)
    };
  }, [executions]);

  // Gap Analysis - identifica categorias com pior performance
  const gapAnalysis = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const categoryStats: Record<string, { total: number; correct: number; count: number }> = {};
    
    results.forEach(result => {
      const category = result.qa_test_cases?.category || 'Sem categoria';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, correct: 0, count: 0 };
      }
      categoryStats[category].total += result.accuracy_score || 0;
      categoryStats[category].correct += result.is_correct ? 1 : 0;
      categoryStats[category].count += 1;
    });
    
    return Object.entries(categoryStats)
      .map(([category, stats]) => {
        const accuracy = (stats.total / stats.count) * 100;
        let recommendation = '';
        
        if (accuracy < 60) {
          recommendation = '🔴 Crítico: Revisar base de conhecimento e adicionar mais exemplos';
        } else if (accuracy < 75) {
          recommendation = '🟡 Atenção: Considerar fine-tuning ou ajustes no prompt';
        } else if (accuracy < 90) {
          recommendation = '🟢 Bom: Monitorar tendências e manter qualidade';
        } else {
          recommendation = '✅ Excelente: Performance dentro do esperado';
        }
        
        return {
          category,
          accuracy: accuracy.toFixed(1),
          testCount: stats.count,
          correctCount: stats.correct,
          recommendation
        };
      })
      .sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy));
  }, [results]);

  // Top 10 Cognitive Gaps - maior distância semântica
  const topCognitiveGaps = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    return results
      .filter(r => r.accuracy_score < 0.7)
      .sort((a, b) => a.accuracy_score - b.accuracy_score)
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        distance: (1 - (r.accuracy_score || 0)).toFixed(2),
        question: r.qa_test_cases?.question || r.qa_test_cases?.query || 'Pergunta não encontrada',
        expected: r.qa_test_cases?.expected_answer || '',
        actual: r.actual_answer || ''
      }));
  }, [results]);

  // Recomendações Automatizadas
  const recommendations = useMemo(() => {
    const recs: Array<{ priority: string; title: string; description: string; actionLabel: string }> = [];
    
    // Recomendação 1: Categoria com pior performance
    const worstCategory = gapAnalysis[0];
    if (worstCategory && parseFloat(worstCategory.accuracy) < 70) {
      recs.push({
        priority: 'high',
        title: `Categoria "${worstCategory.category}" com baixa performance`,
        description: `Apenas ${worstCategory.accuracy}% de acurácia em ${worstCategory.testCount} testes. ${worstCategory.recommendation}`,
        actionLabel: 'Revisar casos de teste'
      });
    }
    
    // Recomendação 2: Poucos casos ativos
    if (testCases && testCases.length < 20) {
      recs.push({
        priority: 'medium',
        title: 'Base de testes pequena',
        description: `Você tem apenas ${testCases.length} casos de teste. Recomendamos pelo menos 50 casos para cobertura adequada.`,
        actionLabel: 'Adicionar mais casos'
      });
    }
    
    // Recomendação 3: Últimas execuções falhando
    if (executions) {
      const recentFailures = executions.slice(0, 5).filter(e => e.status === 'failed').length;
      if (recentFailures >= 2) {
        recs.push({
          priority: 'high',
          title: 'Múltiplas falhas recentes',
          description: `${recentFailures} das últimas 5 execuções falharam. Verifique logs e configuração de agentes.`,
          actionLabel: 'Investigar falhas'
        });
      }
    }
    
    // Recomendação 4: Tempo de resposta alto
    if (executions && executions.length > 0) {
      const avgResponseTime = executions.reduce((sum, e) => sum + (e.avg_response_time_ms || 0), 0) / executions.length;
      if (avgResponseTime > 5000) {
        recs.push({
          priority: 'medium',
          title: 'Tempo de resposta elevado',
          description: `Média de ${(avgResponseTime / 1000).toFixed(1)}s por consulta. Considere otimizar retrieval ou usar modelos mais rápidos.`,
          actionLabel: 'Otimizar performance'
        });
      }
    }

    // Mensagem padrão se tudo estiver OK
    if (recs.length === 0) {
      recs.push({
        priority: 'low',
        title: '✅ Sistema operando normalmente',
        description: 'Todas as métricas estão dentro dos parâmetros esperados. Continue monitorando a performance.',
        actionLabel: 'Ver métricas detalhadas'
      });
    }
    
    return recs;
  }, [gapAnalysis, testCases, executions]);

  // Dados para gráfico de tendência
  const trendData = useMemo(() => {
    if (!executions || executions.length === 0) return [];
    
    return executions
      .filter(exec => exec.status === 'completed')
      .slice(0, 10)
      .map(exec => ({
        date: new Date(exec.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        accuracy: ((exec.overall_accuracy || 0) * 100).toFixed(1),
        responseTime: ((exec.avg_response_time_ms || 0) / 1000).toFixed(1)
      }))
      .reverse();
  }, [executions]);

  // Distribuição por categoria
  const categoryDistribution = useMemo(() => {
    if (!testCases || testCases.length === 0) return [];
    
    const distribution: Record<string, number> = {};
    testCases.forEach(tc => {
      const cat = tc.category || 'Sem categoria';
      distribution[cat] = (distribution[cat] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [testCases]);

  const handleExecuteTests = async (config: any) => {
    try {
      toast.info('Iniciando execução de testes...');
      
      await runValidation(config);
      
      toast.success('Testes iniciados com sucesso!');
      
      setTimeout(() => {
        refetchExecutions();
      }, 2000);
      
    } catch (error) {
      console.error('Error executing tests:', error);
      toast.error('Erro ao executar testes: ' + (error as Error).message);
    }
  };


  const KPICard = ({ title, value, icon: Icon, description, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>{" "}
            vs período anterior
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#29625D]">Quality & Benchmark Center</h1>
              <Badge variant="outline" className="text-[#29625D] mt-2">
                Sistema Unificado de QA e Benchmarks
              </Badge>
            </div>
            <Button 
              onClick={() => setTestDialogOpen(true)}
              className="gap-2"
              disabled={isRunning}
            >
              <Play className="h-4 w-4" />
              Executar Testes
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="test-cases" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Casos de Teste
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="executions" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Execuções
              </TabsTrigger>
              <TabsTrigger value="cognitive" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Análise Cognitiva
              </TabsTrigger>
            </TabsList>

            {/* ABA: CASOS DE TESTE */}
            <TabsContent value="test-cases" className="space-y-6">
              {/* KPIs Específicos de Casos de Teste */}
              <div className="grid gap-4 md:grid-cols-4">
                <KPICard
                  title="Total de Casos"
                  value={testCaseKPIs.total}
                  icon={ClipboardList}
                  description="Casos cadastrados"
                />
                <KPICard
                  title="Casos Ativos"
                  value={testCaseKPIs.active}
                  icon={CheckCircle}
                  description="Habilitados para teste"
                />
                <KPICard
                  title="Categorias"
                  value={testCaseKPIs.categories}
                  icon={Tag}
                  description="Diferentes categorias"
                />
                <KPICard
                  title="Relacionados SQL"
                  value={testCaseKPIs.sqlRelated}
                  icon={Database}
                  description="Requerem validação SQL"
                />
              </div>

              {/* Gerenciamento Completo de Casos de Teste */}
              <TestCaseManager />
            </TabsContent>

            {/* ABA: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Dashboard Executivo - Orquestração de Qualidade
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Métricas estratégicas e insights sobre a qualidade da orquestração de agentes
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Métricas Consolidadas */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Métricas de Orquestração</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Agentes Ativos</span>
                          <Badge variant="outline">{agents?.filter(a => a.is_active).length || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Casos de Teste</span>
                          <span className="text-sm">{testCaseKPIs.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Execuções Totais</span>
                          <span className="text-sm">{executionKPIs.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Melhor Acurácia</span>
                          <Badge variant="default">{executionKPIs.bestAccuracy}%</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Insights Estratégicos</h3>
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800">✓ Performance Excelente</p>
                          <p className="text-xs text-green-600">Melhor acurácia: {executionKPIs.bestAccuracy}%</p>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">💡 Oportunidade</p>
                          <p className="text-xs text-blue-600">
                            {testCaseKPIs.total < 50 
                              ? `Adicione mais casos de teste (atual: ${testCaseKPIs.total})`
                              : 'Continue expandindo a cobertura de testes'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Tendência */}
                  {trendData.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Tendência de Performance</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="accuracy" 
                            stroke="#10b981" 
                            name="Acurácia (%)" 
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke="#3b82f6" 
                            name="Tempo Resposta (s)" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Distribuição por Categoria */}
                  {categoryDistribution.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Distribuição de Casos por Categoria</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={categoryDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#29625D" name="Casos de Teste" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: EXECUÇÕES */}
            <TabsContent value="executions" className="space-y-6">
              {/* KPIs Específicos de Execuções */}
              <div className="grid gap-4 md:grid-cols-5">
                <KPICard
                  title="Total Executado"
                  value={executionKPIs.total}
                  icon={History}
                  description="Validações realizadas"
                />
                <KPICard
                  title="Melhor Acurácia"
                  value={`${executionKPIs.bestAccuracy}%`}
                  icon={Target}
                  description="Score máximo alcançado"
                />
                <KPICard
                  title="Tempo Médio"
                  value={`${executionKPIs.avgTime}s`}
                  icon={Clock}
                  description="Por consulta"
                />
                <KPICard
                  title="Em Execução"
                  value={executionKPIs.running}
                  icon={RefreshCw}
                  description="Testes ativos agora"
                />
                <KPICard
                  title="Taxa de Falha"
                  value={`${executionKPIs.failureRate}%`}
                  icon={AlertCircle}
                  description="Execuções com erro"
                />
              </div>

              {/* Histórico Completo com CRUD */}
              <QAExecutionHistory />
            </TabsContent>

            {/* ABA: ANÁLISE COGNITIVA */}
            <TabsContent value="cognitive" className="space-y-6">
              {/* Gap Analysis - Oportunidades de Melhoria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gap Analysis - Oportunidades de Melhoria
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Categorias com performance abaixo do esperado e recomendações de ação
                  </p>
                </CardHeader>
                <CardContent>
                  {gapAnalysis.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Acurácia Média</TableHead>
                          <TableHead>Casos Testados</TableHead>
                          <TableHead>Recomendação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gapAnalysis.map((gap, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{gap.category}</TableCell>
                            <TableCell>
                              <Badge variant={parseFloat(gap.accuracy) < 70 ? "destructive" : parseFloat(gap.accuracy) < 85 ? "secondary" : "default"}>
                                {gap.accuracy}%
                              </Badge>
                            </TableCell>
                            <TableCell>{gap.testCount} ({gap.correctCount} corretos)</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-md">
                              {gap.recommendation}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum resultado disponível para análise</p>
                      <p className="text-xs text-muted-foreground mt-2">Execute testes para gerar Gap Analysis</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distância Cognitiva - Top 10 Maiores Gaps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Distância Cognitiva - Top 10 Maiores Gaps
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Casos onde a resposta do agente mais divergiu semanticamente do esperado
                  </p>
                </CardHeader>
                <CardContent>
                  {topCognitiveGaps.length > 0 ? (
                    <div className="space-y-4">
                      {topCognitiveGaps.map((gap, idx) => (
                        <div key={gap.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="destructive">Gap: {gap.distance}</Badge>
                            <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                          </div>
                          <p className="text-sm font-medium">
                            <strong>Pergunta:</strong> {gap.question}
                          </p>
                          <div className="grid md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200">
                              <strong className="text-green-800 dark:text-green-200">Esperado:</strong>
                              <p className="mt-1 text-green-700 dark:text-green-300">
                                {gap.expected.substring(0, 120)}...
                              </p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200">
                              <strong className="text-red-800 dark:text-red-200">Obtido:</strong>
                              <p className="mt-1 text-red-700 dark:text-red-300">
                                {gap.actual.substring(0, 120)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum gap cognitivo crítico identificado</p>
                      <p className="text-xs text-muted-foreground mt-2">Execute mais testes para análise detalhada</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recomendações Automatizadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    🤖 Recomendações Automatizadas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Sugestões baseadas em análise de dados e padrões identificados
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${
                          rec.priority === 'high' 
                            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
                            : rec.priority === 'medium' 
                            ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' 
                            : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          rec.priority === 'high' 
                            ? 'text-red-800 dark:text-red-200' 
                            : rec.priority === 'medium' 
                            ? 'text-yellow-800 dark:text-yellow-200' 
                            : 'text-blue-800 dark:text-blue-200'
                        }`}>
                          {rec.title}
                        </p>
                        <p className={`text-xs mt-1 ${
                          rec.priority === 'high' 
                            ? 'text-red-700 dark:text-red-300' 
                            : rec.priority === 'medium' 
                            ? 'text-yellow-700 dark:text-yellow-300' 
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {rec.description}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {rec.actionLabel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Test Execution Dialog */}
      <TestExecutionDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        onExecute={handleExecuteTests}
        agents={agents || []}
        isRunning={isRunning}
        progress={progress}
      />
    </div>
  );
}