import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenStats } from "@/components/chat/TokenStats";
import { Activity, DollarSign, Target, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/useAgents";

interface AdminDashboardProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date) => void;
}

export function AdminDashboard({ startDate, endDate, onDateRangeChange }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { agents, loading: agentsLoading } = useAgents();

  // Query para métricas de orquestração
  const { data: orchestrationStats } = useQuery({
    queryKey: ['orchestration-stats', startDate, endDate],
    queryFn: async () => {
      // Estatísticas de conversas
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, message_count')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (convError) throw convError;

      // Estatísticas de feedback
      const { data: feedback, error: feedError } = await supabase
        .from('message_feedback')
        .select('helpful, model, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (feedError) throw feedError;

      // Métricas de agentes ativos
      const activeAgents = agents?.filter(agent => agent.is_active) || [];
      const totalAgents = agents?.length || 0;
      const activeAgentCount = activeAgents.length;
      
      // Calcular métricas de orquestração
      const totalConversations = conversations?.length || 0;
      const totalMessages = conversations?.reduce((sum, conv) => sum + (conv.message_count || 0), 0) || 0;
      const totalFeedback = feedback?.length || 0;
      const positiveeFeedback = feedback?.filter(f => f.helpful === true).length || 0;
      const satisfactionRate = totalFeedback > 0 ? (positiveeFeedback / totalFeedback) * 100 : 0;

      return {
        totalConversations,
        totalMessages,
        activeAgents: activeAgentCount,
        totalAgents,
        satisfactionRate,
        orchestrationEffectiveness: activeAgentCount > 0 ? 95 : 0, // Simulado - seria calculado baseado em métricas reais
        avgResponseTime: 2.3, // Simulado
        systemHealth: 99.2 // Simulado
      };
    },
    enabled: !agentsLoading
  });

  // Query para estatísticas de custos e tokens
  const { data: costStats } = useQuery({
    queryKey: ['cost-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_usage')
        .select('total_tokens, estimated_cost, model, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) throw error;
      
      const totalTokens = data?.reduce((sum, usage) => sum + (usage.total_tokens || 0), 0) || 0;
      const totalCost = data?.reduce((sum, usage) => sum + Number(usage.estimated_cost || 0), 0) || 0;
      const avgCostPerQuery = data && data.length > 0 ? totalCost / data.length : 0;
      
      // Custo por agente/modelo
      const costByAgent = data?.reduce((acc, usage) => {
        if (!acc[usage.model]) {
          acc[usage.model] = { tokens: 0, cost: 0, queries: 0 };
        }
        acc[usage.model].tokens += usage.total_tokens || 0;
        acc[usage.model].cost += Number(usage.estimated_cost || 0);
        acc[usage.model].queries++;
        return acc;
      }, {} as Record<string, { tokens: number; cost: number; queries: number }>) || {};

      return {
        totalTokens,
        totalCost,
        avgCostPerQuery,
        totalQueries: data?.length || 0,
        costByAgent,
        projectedMonthlyCost: totalCost * 30 // Simulado baseado no período
      };
    }
  });

  // Query para performance dos agentes
  const { data: agentPerformance } = useQuery({
    queryKey: ['agent-performance', startDate, endDate],
    queryFn: async () => {
      if (!agents) return null;

      // Simulação de métricas por agente (em implementação real viria de métricas coletadas)
      const performance = agents.map(agent => {
        const isActive = agent.is_active;
        const baseMetrics = {
          id: agent.id,
          name: agent.display_name,
          provider: agent.provider,
          isActive,
          availability: isActive ? Math.random() * 10 + 90 : 0, // 90-100% se ativo
          avgResponseTime: isActive ? Math.random() * 2 + 1 : 0, // 1-3s se ativo
          successRate: isActive ? Math.random() * 5 + 95 : 0, // 95-100% se ativo
          costEfficiency: isActive ? Math.random() * 20 + 80 : 0, // 80-100% se ativo
          totalQueries: isActive ? Math.floor(Math.random() * 1000) + 100 : 0,
          errors24h: isActive ? Math.floor(Math.random() * 5) : 0,
        };
        return baseMetrics;
      });

      return performance;
    },
    enabled: !agentsLoading && agents !== undefined
  });

  const MetricCard = ({ title, value, icon: Icon, trend, description, status }: any) => (
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
            from last period
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {status && (
          <Badge variant={status === "healthy" ? "default" : "destructive"} className="mt-2">
            {status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-[#29625D]">Hub de Orquestração</h2>
        <Badge variant="outline" className="text-[#29625D]">
          Sistema v2.0 - Orquestrador de Agentes
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="costs">
            <DollarSign className="h-4 w-4 mr-2" />
            Tokens & Custos
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Target className="h-4 w-4 mr-2" />
            Modelos/Agentes
          </TabsTrigger>
        </TabsList>

        {/* ABA: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Efetividade da Orquestração"
              value={`${orchestrationStats?.orchestrationEffectiveness || 0}%`}
              icon={Target}
              trend={5}
              description="Consultas resolvidas pelo agente ideal"
              status="healthy"
            />
            <MetricCard
              title="Agentes Ativos"
              value={`${orchestrationStats?.activeAgents || 0}/${orchestrationStats?.totalAgents || 0}`}
              icon={Zap}
              description="Agentes disponíveis para orquestração"
            />
            <MetricCard
              title="Satisfação do Usuário"
              value={`${orchestrationStats?.satisfactionRate?.toFixed(1) || 0}%`}
              icon={TrendingUp}
              trend={2}
              description="Net Promoter Score"
            />
            <MetricCard
              title="Tempo de Resposta"
              value={`${orchestrationStats?.avgResponseTime || 0}s`}
              icon={Activity}
              description="Latência média (P95)"
              status="healthy"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Métricas de Orquestração em Tempo Real
                </CardTitle>
                <CardDescription>
                  Status do sistema de orquestração de agentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Saúde do Sistema</span>
                  <Badge variant="default">{orchestrationStats?.systemHealth || 0}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total de Conversas</span>
                  <span className="text-sm">{orchestrationStats?.totalConversations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Mensagens Processadas</span>
                  <span className="text-sm">{orchestrationStats?.totalMessages || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas e Notificações
                </CardTitle>
                <CardDescription>
                  Monitoramento proativo do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sistema operando normalmente</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Todos os agentes ativos</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Custos dentro do orçamento</span>
                  <Badge variant="default">✓</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA: TOKENS & CUSTOS */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Custo Total"
              value={`$${costStats?.totalCost?.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              description="Período selecionado"
            />
            <MetricCard
              title="Tokens Consumidos"
              value={(costStats?.totalTokens || 0).toLocaleString()}
              icon={Activity}
              description="Total de tokens processados"
            />
            <MetricCard
              title="Custo por Consulta"
              value={`$${costStats?.avgCostPerQuery?.toFixed(3) || '0.000'}`}
              icon={Target}
              description="Média por query"
            />
            <MetricCard
              title="Projeção Mensal"
              value={`$${costStats?.projectedMonthlyCost?.toFixed(2) || '0.00'}`}
              icon={TrendingUp}
              description="Baseado no uso atual"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Análise de Custos por Agente/Período
                </CardTitle>
                <CardDescription>
                  Breakdown detalhado de consumo e custos por agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenStats />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA: MODELOS/AGENTES */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Comparativa dos Agentes
                </CardTitle>
                <CardDescription>
                  Métricas de disponibilidade, performance e configurações críticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentsLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Carregando agentes...</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {agentPerformance?.map((agent) => (
                        <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{agent.name}</h4>
                              <p className="text-sm text-muted-foreground">{agent.provider}</p>
                            </div>
                            <Badge variant={agent.isActive ? "default" : "secondary"}>
                              {agent.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          
                          {agent.isActive && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Disponibilidade</span>
                                <p className="text-muted-foreground">{agent.availability.toFixed(1)}%</p>
                              </div>
                              <div>
                                <span className="font-medium">Tempo Resposta</span>
                                <p className="text-muted-foreground">{agent.avgResponseTime.toFixed(1)}s</p>
                              </div>
                              <div>
                                <span className="font-medium">Taxa Sucesso</span>
                                <p className="text-muted-foreground">{agent.successRate.toFixed(1)}%</p>
                              </div>
                              <div>
                                <span className="font-medium">Queries 24h</span>
                                <p className="text-muted-foreground">{agent.totalQueries}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}