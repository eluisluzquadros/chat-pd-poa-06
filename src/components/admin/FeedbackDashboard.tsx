import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Brain,
  Calendar as CalendarIcon,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedback } from "@/hooks/useFeedback";
import { DashboardMetrics, FeedbackFilters, FeedbackAlert } from "@/types/feedback";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FeedbackDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  const { getFeedbackMetrics, getFeedback } = useFeedback();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load overview metrics
      const overviewMetrics = await getFeedbackMetrics(filters);
      
      // Load model-specific stats
      const modelStats = await loadModelStats();
      
      // Load trends data
      const trends = await loadTrendsData();
      
      // Load recent alerts
      const alerts = await loadRecentAlerts();
      
      // Load top issues
      const topIssues = await loadTopIssues();

      if (overviewMetrics) {
        setMetrics({
          overview: overviewMetrics,
          byModel: modelStats,
          trends: trends,
          recentAlerts: alerts,
          topIssues: topIssues
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelStats = async () => {
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('model, helpful, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const modelMap = new Map();
      
      data?.forEach(feedback => {
        if (!modelMap.has(feedback.model)) {
          modelMap.set(feedback.model, {
            model: feedback.model,
            total_feedback: 0,
            helpful_count: 0,
            unhelpful_count: 0,
            recent_feedback: []
          });
        }
        
        const modelData = modelMap.get(feedback.model);
        modelData.total_feedback++;
        
        if (feedback.helpful) {
          modelData.helpful_count++;
        } else {
          modelData.unhelpful_count++;
        }
        
        if (modelData.recent_feedback.length < 5) {
          modelData.recent_feedback.push(feedback);
        }
      });

      return Array.from(modelMap.values()).map(model => ({
        ...model,
        helpful_percentage: model.total_feedback > 0 
          ? (model.helpful_count / model.total_feedback) * 100 
          : 0,
        avg_session_satisfaction: model.helpful_percentage / 100
      }));
    } catch (error) {
      console.error('Error loading model stats:', error);
      return [];
    }
  };

  const loadTrendsData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('message_feedback')
        .select('helpful, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dailyStats = new Map();
      
      data?.forEach(feedback => {
        const date = format(new Date(feedback.created_at), 'yyyy-MM-dd');
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { date, helpful: 0, unhelpful: 0, total: 0 });
        }
        
        const stats = dailyStats.get(date);
        stats.total++;
        if (feedback.helpful) {
          stats.helpful++;
        } else {
          stats.unhelpful++;
        }
      });

      return Array.from(dailyStats.values());
    } catch (error) {
      console.error('Error loading trends data:', error);
      return [];
    }
  };

  const loadRecentAlerts = async (): Promise<FeedbackAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('feedback_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading alerts:', error);
      return [];
    }
  };

  const loadTopIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('comment, model')
        .not('comment', 'is', null)
        .eq('helpful', false);

      if (error) throw error;

      // Simple issue categorization based on keywords
      const issueCategories = {
        'incorreta': 'Informação incorreta',
        'incompleta': 'Resposta incompleta',
        'confusa': 'Explicação confusa',
        'lenta': 'Resposta lenta',
        'formatação': 'Problemas de formatação'
      };

      const issueCounts = new Map();
      
      data?.forEach(feedback => {
        const comment = feedback.comment?.toLowerCase() || '';
        let categorized = false;
        
        Object.entries(issueCategories).forEach(([keyword, category]) => {
          if (comment.includes(keyword)) {
            const key = `${category}-${feedback.model}`;
            issueCounts.set(key, {
              issue: category,
              model: feedback.model,
              count: (issueCounts.get(key)?.count || 0) + 1
            });
            categorized = true;
          }
        });
        
        if (!categorized) {
          const key = `Outros problemas-${feedback.model}`;
          issueCounts.set(key, {
            issue: 'Outros problemas',
            model: feedback.model,
            count: (issueCounts.get(key)?.count || 0) + 1
          });
        }
      });

      return Array.from(issueCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      console.error('Error loading top issues:', error);
      return [];
    }
  };

  const exportData = async () => {
    try {
      const feedbacks = await getFeedback(filters);
      const csv = [
        ['Data', 'Modelo', 'Útil', 'Comentário', 'Sessão'].join(','),
        ...feedbacks.map(f => [
          format(new Date(f.created_at), 'dd/MM/yyyy HH:mm'),
          f.model,
          f.helpful ? 'Sim' : 'Não',
          f.comment?.replace(/,/g, ';') || '',
          f.session_id
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Feedback</h1>
          <p className="text-muted-foreground">
            Análise e métricas do feedback dos usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select
            value={filters.model || "all"}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              model: value === "all" ? undefined : value 
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os modelos</SelectItem>
              {metrics?.byModel.map(model => (
                <SelectItem key={model.model} value={model.model}>
                  {model.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.helpful === null ? "all" : filters.helpful?.toString()}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              helpful: value === "all" ? null : value === "true"
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de feedback" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Positivos</SelectItem>
              <SelectItem value="false">Negativos</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-64">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {selectedDateRange.from ? (
                  selectedDateRange.to ? (
                    <>
                      {format(selectedDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(selectedDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(selectedDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  "Selecionar período"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={selectedDateRange.from}
                selected={selectedDateRange}
                onSelect={setSelectedDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Feedbacks</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.overview.total_feedback || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.overview.comment_count || 0} com comentários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.overview.helpful_percentage.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.overview.helpful_count || 0} positivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedbacks Negativos</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.overview.unhelpful_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Precisam de atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics?.recentAlerts.filter(a => !a.resolved).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requerem ação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Por Modelo</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="issues">Principais Problemas</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {metrics?.byModel.map((model) => (
              <Card key={model.model}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {model.model}
                    </CardTitle>
                    <Badge variant={model.helpful_percentage >= 70 ? "default" : "destructive"}>
                      {model.helpful_percentage.toFixed(1)}% satisfação
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{model.total_feedback}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Positivos</p>
                      <p className="font-medium text-green-600">{model.helpful_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Negativos</p>
                      <p className="font-medium text-red-600">{model.unhelpful_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendência dos Últimos 30 Dias</CardTitle>
              <CardDescription>
                Evolução do feedback ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple trend visualization - you could integrate a chart library here */}
              <div className="space-y-2">
                {metrics?.trends.slice(-7).map((trend, index) => (
                  <div key={trend.date} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{format(new Date(trend.date), 'dd/MM', { locale: ptBR })}</span>
                    <div className="flex gap-2 text-sm">
                      <span className="text-green-600">+{trend.helpful}</span>
                      <span className="text-red-600">-{trend.unhelpful}</span>
                      <span className="text-muted-foreground">({trend.total} total)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {metrics?.recentAlerts.map((alert) => (
              <Card key={alert.id} className={cn(
                "border-l-4",
                alert.severity === "critical" ? "border-l-red-500" :
                alert.severity === "high" ? "border-l-orange-500" :
                alert.severity === "medium" ? "border-l-yellow-500" :
                "border-l-blue-500"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className={cn(
                        "h-4 w-4",
                        alert.severity === "critical" ? "text-red-500" :
                        alert.severity === "high" ? "text-orange-500" :
                        alert.severity === "medium" ? "text-yellow-500" :
                        "text-blue-500"
                      )} />
                      {alert.alert_type === "negative_feedback" ? "Feedback Negativo" :
                       alert.alert_type === "low_rating" ? "Avaliação Baixa" :
                       "Detecção de Spam"}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={alert.resolved ? "default" : "destructive"}>
                        {alert.resolved ? "Resolvido" : "Ativo"}
                      </Badge>
                      <Badge variant="outline">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Modelo:</strong> {alert.model}</p>
                    <p><strong>Data:</strong> {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    {alert.comment && (
                      <div>
                        <strong>Comentário:</strong>
                        <p className="mt-1 p-2 bg-muted rounded text-xs">{alert.comment}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Principais Problemas Reportados</CardTitle>
              <CardDescription>
                Categorização automática dos feedbacks negativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.topIssues.map((issue, index) => (
                  <div key={`${issue.issue}-${issue.model}`} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{issue.issue}</p>
                        <p className="text-sm text-muted-foreground">Modelo: {issue.model}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">{issue.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}