import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersAnalytics } from "@/components/reports/UsersAnalytics";
import { ConversationsAnalytics } from "@/components/reports/ConversationsAnalytics";
import { InterestAnalytics } from "@/components/reports/InterestAnalytics";
import { TokenStats } from "@/components/chat/TokenStats";
import { BarChart, Users, MessageSquare, TrendingUp, Brain, Star, AlertTriangle, BarChart3, UserPlus, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminDashboardProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date) => void;
}

export function AdminDashboard({ startDate, endDate, onDateRangeChange }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Query para feedback das mensagens
  const { data: feedbackStats } = useQuery({
    queryKey: ['feedback-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('helpful, model, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) throw error;
      
      const totalFeedback = data.length;
      const helpfulCount = data.filter(f => f.helpful === true).length;
      const unhelpfulCount = data.filter(f => f.helpful === false).length;
      const satisfactionRate = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;
      
      // Feedback por modelo
      const modelFeedback = data.reduce((acc, feedback) => {
        if (!acc[feedback.model]) {
          acc[feedback.model] = { total: 0, helpful: 0 };
        }
        acc[feedback.model].total++;
        if (feedback.helpful) acc[feedback.model].helpful++;
        return acc;
      }, {} as Record<string, { total: number; helpful: number }>);

      return {
        totalFeedback,
        helpfulCount,
        unhelpfulCount,
        satisfactionRate,
        modelFeedback
      };
    }
  });

  // Query para estatísticas de token usage
  const { data: tokenStats } = useQuery({
    queryKey: ['token-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_usage')
        .select('total_tokens, estimated_cost, model, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) throw error;
      
      const totalTokens = data.reduce((sum, usage) => sum + usage.total_tokens, 0);
      const totalCost = data.reduce((sum, usage) => sum + Number(usage.estimated_cost), 0);
      
      // Uso por modelo
      const modelUsage = data.reduce((acc, usage) => {
        if (!acc[usage.model]) {
          acc[usage.model] = { tokens: 0, cost: 0, calls: 0 };
        }
        acc[usage.model].tokens += usage.total_tokens;
        acc[usage.model].cost += Number(usage.estimated_cost);
        acc[usage.model].calls++;
        return acc;
      }, {} as Record<string, { tokens: number; cost: number; calls: number }>);

      return {
        totalTokens,
        totalCost,
        modelUsage,
        totalCalls: data.length
      };
    }
  });

  // Query para estatísticas de QA validation
  const { data: qaStats } = useQuery({
    queryKey: ['qa-validation-stats'],
    queryFn: async () => {
      // Get only completed validation runs (filter out stuck 'running' ones)
      const { data: runs, error } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      const latestRun = runs?.[0];
      
      // Get active test cases count
      const { count: testCasesCount } = await supabase
        .from('qa_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Check for any running validations
      const { count: runningCount } = await supabase
        .from('qa_validation_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');
      
      return {
        lastValidationAccuracy: latestRun?.overall_accuracy ? (latestRun.overall_accuracy * 100) : null,
        avgResponseTime: latestRun?.avg_response_time_ms || null,
        totalTestCases: testCasesCount || 0,
        lastValidationStatus: latestRun?.status || 'never_run',
        hasRunningValidation: (runningCount || 0) > 0
      };
    }
  });

  return (
    <div className="space-y-8">
      {/* Header elegante */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-lg text-muted-foreground">
            Monitoramento e análise do sistema Multi-LLM
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="text-sm py-3">Visão Geral</TabsTrigger>
          <TabsTrigger value="tokens" className="text-sm py-3">Tokens & Custos</TabsTrigger>
          <TabsTrigger value="models" className="text-sm py-3">Modelos</TabsTrigger>
          <TabsTrigger value="feedback" className="text-sm py-3">Feedback</TabsTrigger>
          <TabsTrigger value="users" className="text-sm py-3">Usuários</TabsTrigger>
          <TabsTrigger value="conversations" className="text-sm py-3">Conversas</TabsTrigger>
          <TabsTrigger value="interests" className="text-sm py-3">Manifestações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Cards de métricas principais com design elegante */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total de Tokens</CardTitle>
                <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  {tokenStats?.totalTokens?.toLocaleString() || '0'}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Em {tokenStats?.totalCalls || 0} chamadas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">Custo Estimado</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                  ${tokenStats?.totalCost?.toFixed(4) || '0.0000'}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Período selecionado
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300">Taxa de Satisfação</CardTitle>
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-800 dark:text-amber-200">
                  {feedbackStats?.satisfactionRate?.toFixed(1) || '0'}%
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  {feedbackStats?.totalFeedback || 0} avaliações
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300">Feedback Negativo</CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-800 dark:text-red-200">
                  {feedbackStats?.unhelpfulCount || 0}
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Requer atenção
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo executivo */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Resumo Operacional
                </CardTitle>
                <CardDescription>
                  Indicadores-chave de performance do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Modelos Ativos</span>
                    <span className="text-lg font-bold">{Object.keys(tokenStats?.modelUsage || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Média de Satisfação</span>
                    <span className="text-lg font-bold">{feedbackStats?.satisfactionRate?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Custo por Token</span>
                    <span className="text-lg font-bold">
                      ${((tokenStats?.totalCost || 0) / (tokenStats?.totalTokens || 1)).toFixed(6)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Atividade do Sistema
                </CardTitle>
                <CardDescription>
                  Métricas de uso e engajamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total de Chamadas</span>
                    <span className="text-lg font-bold">{tokenStats?.totalCalls || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Feedback Positivo</span>
                    <span className="text-lg font-bold text-green-600">{feedbackStats?.helpfulCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Necessita Melhoria</span>
                    <span className="text-lg font-bold text-red-600">{feedbackStats?.unhelpfulCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Modelo</CardTitle>
              <CardDescription>
                Uso de tokens, custos e taxa de satisfação por modelo LLM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tokenStats?.modelUsage && Object.entries(tokenStats.modelUsage).map(([model, stats]) => {
                  const modelFeedback = feedbackStats?.modelFeedback?.[model];
                  const satisfactionRate = modelFeedback 
                    ? (modelFeedback.helpful / modelFeedback.total) * 100 
                    : 0;

                  return (
                    <div key={model} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{model}</h3>
                          <Badge variant={satisfactionRate > 80 ? "default" : satisfactionRate > 60 ? "secondary" : "destructive"}>
                            {satisfactionRate.toFixed(1)}% satisfação
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {stats.calls} chamadas • {stats.tokens.toLocaleString()} tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${stats.cost.toFixed(4)}</div>
                        <div className="text-sm text-muted-foreground">
                          {modelFeedback?.total || 0} avaliações
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Feedback</CardTitle>
              <CardDescription>
                Detalhamento das avaliações dos usuários por modelo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {feedbackStats?.helpfulCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Positivos</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {feedbackStats?.unhelpfulCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Negativos</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {feedbackStats?.satisfactionRate?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa Global</div>
                  </div>
                </div>

                {feedbackStats?.modelFeedback && Object.entries(feedbackStats.modelFeedback).map(([model, feedback]) => (
                  <div key={model} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{model}</h3>
                      <Badge variant="outline">
                        {((feedback.helpful / feedback.total) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {feedback.helpful} positivos de {feedback.total} total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Usuários</CardTitle>
              <CardDescription>
                Estatísticas e métricas de usuários ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersAnalytics timeRange="month" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estatísticas de Uso de Tokens
              </CardTitle>
              <CardDescription>
                Análise detalhada do consumo de tokens por modelo e custos estimados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TokenStats />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Conversas</CardTitle>
              <CardDescription>
                Métricas detalhadas sobre as conversas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversationsAnalytics timeRange="month" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Manifestações de Interesse
              </CardTitle>
              <CardDescription>
                Análise das manifestações de interesse no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InterestAnalytics timeRange="month" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}