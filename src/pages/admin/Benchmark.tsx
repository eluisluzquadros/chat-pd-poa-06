import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentSelector } from '@/components/ui/agent-selector';
import { useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, RefreshCw, TrendingUp, Clock, DollarSign, Target } from 'lucide-react';

interface BenchmarkResult {
  id: string;
  agent_id: string;
  agent_name: string;
  total_tests: number;
  passed_tests: number;
  success_rate: number;
  avg_response_time: number;
  avg_cost_per_query: number;
  created_at: string;
}

export default function Benchmark() {
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  // Set default agent
  useEffect(() => {
    const activeAgents = agents.filter(agent => agent.is_active);
    if (activeAgents.length > 0 && !selectedAgent) {
      const defaultAgent = activeAgents.find(agent => agent.is_default) || activeAgents[0];
      setSelectedAgent(defaultAgent.id);
    }
  }, [agents, selectedAgent]);

  const loadBenchmarkResults = async () => {
    try {
      setLoading(true);
      
      // Get benchmark results from QA validation runs
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedResults: BenchmarkResult[] = (data || []).map(run => ({
        id: run.id,
        agent_id: run.model || 'unknown',
        agent_name: run.model || 'Modelo Desconhecido',
        total_tests: run.total_tests || 0,
        passed_tests: run.passed_tests || 0,
        success_rate: run.overall_accuracy || 0,
        avg_response_time: run.avg_response_time_ms || 0,
        avg_cost_per_query: 0, // Calculate if needed
        created_at: run.started_at
      }));

      setResults(formattedResults);
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      toast.error('Erro ao carregar resultados do benchmark');
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    if (!selectedAgent) {
      toast.error('Selecione um agente para executar o benchmark');
      return;
    }

    try {
      setRunningBenchmark(true);
      
      const selectedAgentData = agents.find(agent => agent.id === selectedAgent);
      if (!selectedAgentData) {
        throw new Error('Agente selecionado não encontrado');
      }

      // Run benchmark using the agent validation system
      const { data, error } = await supabase.functions.invoke('run-qa-validation', {
        body: {
          model: selectedAgentData.model,
          provider: selectedAgentData.provider,
          agent_id: selectedAgent,
          benchmark_mode: true
        }
      });

      if (error) throw error;

      toast.success('Benchmark executado com sucesso!');
      await loadBenchmarkResults();
    } catch (error) {
      console.error('Erro ao executar benchmark:', error);
      toast.error('Erro ao executar benchmark');
    } finally {
      setRunningBenchmark(false);
    }
  };

  useEffect(() => {
    loadBenchmarkResults();
  }, []);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const avgSuccessRate = results.length > 0 
    ? results.reduce((sum, r) => sum + r.success_rate, 0) / results.length 
    : 0;

  const avgResponseTime = results.length > 0 
    ? results.reduce((sum, r) => sum + r.avg_response_time, 0) / results.length 
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benchmark de Agentes</h1>
          <p className="text-muted-foreground">Compare o desempenho e qualidade dos agentes configurados</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadBenchmarkResults} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={runBenchmark} 
            disabled={runningBenchmark || !selectedAgent}
          >
            <Play className="h-4 w-4 mr-2" />
            {runningBenchmark ? 'Executando...' : 'Executar Benchmark'}
          </Button>
        </div>
      </div>

      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <AgentSelector
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              label="Agente para Benchmark"
              showDetails={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(avgSuccessRate)}`}>
              {avgSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado em {results.length} execuções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgResponseTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Latência média dos agentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Testes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.reduce((sum, r) => sum + r.total_tests, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Testes executados no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Testados</CardTitle>
            <Badge variant="outline">{new Set(results.map(r => r.agent_name)).size}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(results.map(r => r.agent_name)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Agentes únicos avaliados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando resultados...</div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum resultado de benchmark encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{result.agent_name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(result.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.passed_tests}/{result.total_tests} testes aprovados
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold ${getSuccessRateColor(result.success_rate)}`}>
                            {result.success_rate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.avg_response_time}ms
                          </div>
                        </div>
                        <Badge 
                          variant={result.success_rate >= 80 ? 'default' : 'destructive'}
                        >
                          {result.success_rate >= 80 ? 'Aprovado' : 'Reprovado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Comparação avançada em desenvolvimento...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}