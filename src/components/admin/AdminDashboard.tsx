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
        .select('id, created_at, message_count, agent_id')
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
      const satisfactionRate = totalFeedback > 0 ? (positiveeFeedback / totalFeedback) * 100 : null;

      // Calcular efetividade da orquestração baseada em dados reais
      const conversationsWithAgents = conversations?.filter(conv => conv.agent_id) || [];
      const orchestrationEffectiveness = totalConversations > 0 
        ? (conversationsWithAgents.length / totalConversations) * 100 
        : null;

      // Tempo de resposta: usar dados reais ou reportar null (sem dados sintéticos)
      const avgResponseTime = null; // TODO: Implementar com timestamps reais de chat_history

      // Saúde do sistema: usar componentes reais sem boosts artificiais
      const systemHealth = activeAgentCount > 0 && orchestrationEffectiveness !== null && satisfactionRate !== null
        ? Math.min(100, (orchestrationEffectiveness + satisfactionRate) / 2)
        : null;

      return {
        totalConversations,
        totalMessages,
        activeAgents: activeAgentCount,
        totalAgents,
        satisfactionRate,
        orchestrationEffectiveness,
        avgResponseTime,
        systemHealth
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
      const avgCostPerQuery = data && data.length > 0 ? totalCost / data.length : null;
      
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
        costByAgent
        // Removido projectedMonthlyCost - era simulado
      };
    }
  });

  // Query para performance dos agentes com dados reais
  const { data: agentPerformance } = useQuery({
    queryKey: ['agent-performance', startDate, endDate],
    queryFn: async () => {
      if (!agents) return null;

      // Buscar conversas por agente
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('agent_id, message_count, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (convError) throw convError;

      // Buscar feedback por agente (via join com conversations)
      const { data: feedback, error: feedError } = await supabase
        .from('message_feedback')
        .select('helpful, model, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (feedError) throw feedError;

      // Buscar custos por agente
      const { data: tokenUsage, error: tokenError } = await supabase
        .from('token_usage')
        .select('model, total_tokens, estimated_cost, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tokenError) throw tokenError;

      // Calcular métricas reais por agente
      const performance = agents.map(agent => {
        const isActive = agent.is_active;
        
        // Conversas atribuídas a este agente
        const agentConversations = conversations?.filter(conv => conv.agent_id === agent.id) || [];
        const totalQueries = agentConversations.length;
        const totalMessages = agentConversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
        
        // Feedback para este agente (match por nome/modelo)
        const agentFeedback = feedback?.filter(f => 
          f.model === agent.name || f.model === agent.display_name || f.model === agent.model
        ) || [];
        const positiveFeedback = agentFeedback.filter(f => f.helpful === true).length;
        const successRate = agentFeedback.length > 0 ? (positiveFeedback / agentFeedback.length) * 100 : 0;
        
        // Custos para este agente
        const agentTokens = tokenUsage?.filter(tu => 
          tu.model === agent.name || tu.model === agent.display_name || tu.model === agent.model
        ) || [];
        const totalCost = agentTokens.reduce((sum, tu) => sum + Number(tu.estimated_cost || 0), 0);
        const totalTokensUsed = agentTokens.reduce((sum, tu) => sum + (tu.total_tokens || 0), 0);
        // Eficiência de custo: ratio real sem escalas arbitrárias
        const costEfficiency = totalCost > 0 ? totalQueries / totalCost : null;

        // Disponibilidade: sem dados reais de uptime, reportar null
        const availability = null; // TODO: usar logs de status real ou health checks

        // Taxa de sucesso: apenas dados reais, sem defaults sintéticos
        const realSuccessRate = agentFeedback.length > 0 ? successRate : null;

        // Erros: apenas contagem real de feedbacks negativos
        const errors24h = agentFeedback.length > 0 
          ? agentFeedback.length - positiveFeedback
          : null;

        // Tempo de resposta: usar dados reais (TODO: implementar com timestamps)
        const avgResponseTime = null; // Sem dados sintéticos

        const baseMetrics = {
          id: agent.id,
          name: agent.display_name,
          provider: agent.provider,
          isActive,
          availability,
          avgResponseTime,
          successRate: realSuccessRate,
          costEfficiency,
          totalQueries,
          errors24h,
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
              value={orchestrationStats && orchestrationStats.orchestrationEffectiveness !== null ? `${orchestrationStats.orchestrationEffectiveness.toFixed(1)}%` : "Sem dados"}
              icon={Target}
              description="Consultas resolvidas pelo agente ideal"
            />
            <MetricCard
              title="Agentes Ativos"
              value={`${orchestrationStats?.activeAgents || 0}/${orchestrationStats?.totalAgents || 0}`}
              icon={Zap}
              description="Agentes disponíveis para orquestração"
            />
            <MetricCard
              title="Satisfação do Usuário"
              value={orchestrationStats && orchestrationStats.satisfactionRate !== null ? `${orchestrationStats.satisfactionRate.toFixed(1)}%` : "Sem dados"}
              icon={TrendingUp}
              description="Net Promoter Score"
            />
            <MetricCard
              title="Tempo de Resposta"
              value={orchestrationStats && orchestrationStats.avgResponseTime !== null ? `${orchestrationStats.avgResponseTime}s` : "Sem dados"}
              icon={Activity}
              description="Latência média (P95)"
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
                  <Badge variant="default">
                    {orchestrationStats && orchestrationStats.systemHealth !== null ? `${orchestrationStats.systemHealth.toFixed(1)}%` : "Sem dados"}
                  </Badge>
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
                <div className="text-sm text-muted-foreground">
                  Nenhum alerta ativo no momento.
                  <br />
                  TODO: Implementar alertas baseados em dados reais.
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
              value={costStats && costStats.avgCostPerQuery !== null ? `$${costStats.avgCostPerQuery.toFixed(3)}` : "Sem dados"}
              icon={Target}
              description="Média por query"
            />
            <MetricCard
              title="Queries Executadas"
              value={costStats?.totalQueries || 0}
              icon={TrendingUp}
              description="Total no período selecionado"
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
                                <p className="text-muted-foreground">
                                  {agent.availability !== null ? `${agent.availability.toFixed(1)}%` : "Sem dados"}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Tempo Resposta</span>
                                <p className="text-muted-foreground">
                                  {agent.avgResponseTime !== null ? `${agent.avgResponseTime.toFixed(1)}s` : "Sem dados"}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Taxa Sucesso</span>
                                <p className="text-muted-foreground">
                                  {agent.successRate !== null ? `${agent.successRate.toFixed(1)}%` : "Sem dados"}
                                </p>
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