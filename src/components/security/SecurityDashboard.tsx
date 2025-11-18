import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function SecurityDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        incidents24h,
        critical24h,
        incidents7d,
        incidents30d,
        incidents60d,
        lastSimulation,
        activeAutomations,
        automationLogs7d,
      ] = await Promise.all([
        supabase
          .from('security_incident_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo.toISOString()),
        
        supabase
          .from('security_incident_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo.toISOString())
          .eq('threat_level', 'critical'),
        
        supabase
          .from('security_incident_reports')
          .select('created_at, resolved_at')
          .gte('created_at', oneWeekAgo.toISOString())
          .not('resolved_at', 'is', null),
        
        supabase
          .from('security_incident_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        
        supabase
          .from('security_incident_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        supabase
          .from('security_validation_runs')
          .select('started_at, total_tests, passed_tests')
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        supabase
          .from('security_automation_configs')
          .select('id, next_run_at', { count: 'exact' })
          .eq('is_enabled', true),
        
        supabase
          .from('security_automation_logs')
          .select('status')
          .gte('started_at', oneWeekAgo.toISOString()),
      ]);

      // Calcular tempo médio de resposta
      const avgResponseTime = incidents7d.data && incidents7d.data.length > 0
        ? incidents7d.data.reduce((acc, incident) => {
            const created = new Date(incident.created_at).getTime();
            const resolved = new Date(incident.resolved_at).getTime();
            return acc + (resolved - created) / (1000 * 60); // em minutos
          }, 0) / incidents7d.data.length
        : 0;

      // Calcular tendência
      const current = incidents30d.count || 0;
      const previous = incidents60d.count || 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (current > previous * 1.1) trend = 'up';
      else if (current < previous * 0.9) trend = 'down';

      // Taxa de sucesso de automações
      const automationSuccessRate = automationLogs7d.data && automationLogs7d.data.length > 0
        ? (automationLogs7d.data.filter(log => log.status === 'success').length / automationLogs7d.data.length) * 100
        : 100;

      // Próxima automação
      const nextRun = activeAutomations.data && activeAutomations.data.length > 0
        ? activeAutomations.data.reduce((earliest, config) => {
            if (!config.next_run_at) return earliest;
            const nextDate = new Date(config.next_run_at);
            return !earliest || nextDate < earliest ? nextDate : earliest;
          }, null as Date | null)
        : null;

      return {
        total_incidents_24h: incidents24h.count || 0,
        critical_incidents_24h: critical24h.count || 0,
        blocked_attacks_24h: (incidents24h.count || 0) - (critical24h.count || 0),
        total_incidents_7d: (incidents7d.data?.length || 0),
        avg_response_time_7d: Math.round(avgResponseTime),
        total_incidents_30d: incidents30d.count || 0,
        trend_30d: trend,
        last_simulation_date: lastSimulation.data?.started_at || null,
        last_simulation_success_rate: lastSimulation.data
          ? Math.round((lastSimulation.data.passed_tests / lastSimulation.data.total_tests) * 100)
          : 0,
        total_simulations_30d: 0, // Would need separate query
        total_automations_active: activeAutomations.count || 0,
        next_automation_run: nextRun ? nextRun.toISOString() : null,
        automation_success_rate_7d: Math.round(automationSuccessRate),
      };
    },
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (metrics?.trend_30d) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (metrics?.trend_30d) {
      case 'up': return 'text-red-500';
      case 'down': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const formatNextRun = (date: string | null) => {
    if (!date) return 'Não agendado';
    const next = new Date(date);
    const now = new Date();
    const diffMs = next.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 0) return 'Atrasado';
    if (diffMins < 60) return `Em ${diffMins}min`;
    if (diffMins < 1440) return `Em ${Math.round(diffMins / 60)}h`;
    return `Em ${Math.round(diffMins / 1440)}d`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Incidentes 24h */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Incidentes 24h
          </CardTitle>
          <Shield className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.total_incidents_24h || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.critical_incidents_24h || 0} críticos
          </p>
        </CardContent>
      </Card>

      {/* Ataques Bloqueados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ataques Bloqueados
          </CardTitle>
          <Shield className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {metrics?.blocked_attacks_24h || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Últimas 24h</p>
        </CardContent>
      </Card>

      {/* Tempo de Resposta */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tempo Médio
          </CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.avg_response_time_7d || 0}min</div>
          <p className="text-xs text-muted-foreground mt-1">Resposta (7d)</p>
        </CardContent>
      </Card>

      {/* Tendência 30d */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tendência 30d
          </CardTitle>
          {getTrendIcon()}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getTrendColor()}`}>
            {metrics?.total_incidents_30d || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.trend_30d === 'up' ? 'Aumentando' : metrics?.trend_30d === 'down' ? 'Diminuindo' : 'Estável'}
          </p>
        </CardContent>
      </Card>

      {/* Última Simulação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Última Simulação
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.last_simulation_success_rate || 0}%</div>
          <Progress 
            value={metrics?.last_simulation_success_rate || 0} 
            className="h-2 mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.last_simulation_date 
              ? new Date(metrics.last_simulation_date).toLocaleDateString('pt-BR')
              : 'Nunca executada'}
          </p>
        </CardContent>
      </Card>

      {/* Automações Ativas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Automações
          </CardTitle>
          <Shield className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.total_automations_active || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Ativas</p>
        </CardContent>
      </Card>

      {/* Próxima Execução */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Próxima Execução
          </CardTitle>
          <Clock className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNextRun(metrics?.next_automation_run || null)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Agendamento</p>
        </CardContent>
      </Card>

      {/* Taxa de Sucesso Automações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taxa de Sucesso
          </CardTitle>
          <Badge variant={metrics?.automation_success_rate_7d >= 90 ? "default" : "destructive"}>
            7d
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.automation_success_rate_7d || 0}%</div>
          <Progress 
            value={metrics?.automation_success_rate_7d || 0} 
            className="h-2 mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">Automações</p>
        </CardContent>
      </Card>
    </div>
  );
}
