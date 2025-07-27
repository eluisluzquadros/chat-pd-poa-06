import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersAnalytics } from "@/components/reports/UsersAnalytics";
import { ConversationsAnalytics } from "@/components/reports/ConversationsAnalytics";
import { InterestAnalytics } from "@/components/reports/InterestAnalytics";
import { BarChart, Users, MessageSquare, TrendingUp, Brain, Star, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QADashboard } from "./QADashboard";

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

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Monitoramento e análise do sistema Multi-LLM
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="qa">Validação QA</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cards de métricas principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tokenStats?.totalTokens?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em {tokenStats?.totalCalls || 0} chamadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${tokenStats?.totalCost?.toFixed(4) || '0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Período selecionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {feedbackStats?.satisfactionRate?.toFixed(1) || '0'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {feedbackStats?.totalFeedback || 0} avaliações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feedback Negativo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {feedbackStats?.unhelpfulCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requer atenção
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Componentes de análise existentes */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Usuários e Conversas</CardTitle>
              <CardDescription>
                Estatísticas gerais do período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Análises detalhadas disponíveis nas outras abas
              </p>
            </CardContent>
          </Card>
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

        <TabsContent value="qa" className="space-y-6">
          <QADashboard />
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
              <p className="text-muted-foreground">
                Dashboard de usuários em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Conversas</CardTitle>
              <CardDescription>
                Métricas e estatísticas das conversas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Dashboard de conversas em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}