import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Users,
  Brain,
  AlertTriangle,
  BarChart3,
  PieChart,
  RefreshCw
} from "lucide-react";
import { useFeedback } from "@/hooks/useFeedback";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalFeedback: number;
  satisfactionRate: number;
  trendDirection: 'up' | 'down' | 'stable';
  modelPerformance: Array<{
    model: string;
    satisfaction: number;
    totalFeedback: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  dailyTrends: Array<{
    date: string;
    positive: number;
    negative: number;
    total: number;
  }>;
  topIssues: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export function FeedbackAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const { getFeedbackMetrics } = useFeedback();

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Load general metrics
      const metrics = await getFeedbackMetrics({
        dateRange: { start: startDate, end: endDate }
      });

      // Load model performance
      const { data: modelData } = await supabase
        .from('message_feedback')
        .select('model, helpful, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Process model performance
      const modelMap = new Map();
      modelData?.forEach(feedback => {
        if (!modelMap.has(feedback.model)) {
          modelMap.set(feedback.model, { total: 0, positive: 0 });
        }
        const modelStats = modelMap.get(feedback.model);
        modelStats.total++;
        if (feedback.helpful) modelStats.positive++;
      });

      const modelPerformance = Array.from(modelMap.entries()).map(([model, stats]) => ({
        model,
        satisfaction: (stats.positive / stats.total) * 100,
        totalFeedback: stats.total,
        trend: 'stable' as const // Could be calculated from historical data
      }));

      // Load daily trends
      const dailyMap = new Map();
      modelData?.forEach(feedback => {
        const date = new Date(feedback.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { positive: 0, negative: 0, total: 0 });
        }
        const dayStats = dailyMap.get(date);
        dayStats.total++;
        if (feedback.helpful) {
          dayStats.positive++;
        } else {
          dayStats.negative++;
        }
      });

      const dailyTrends = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Load top issues (simplified categorization)
      const { data: negativeComments } = await supabase
        .from('message_feedback')
        .select('comment')
        .eq('helpful', false)
        .not('comment', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const issueCategories = {
        'incorreta': 'Informação incorreta',
        'incompleta': 'Resposta incompleta',
        'confusa': 'Explicação confusa',
        'lenta': 'Resposta lenta',
        'formatação': 'Problemas de formatação'
      };

      const issueCounts = new Map();
      let totalIssues = 0;

      negativeComments?.forEach(feedback => {
        const comment = feedback.comment?.toLowerCase() || '';
        let categorized = false;
        
        Object.entries(issueCategories).forEach(([keyword, category]) => {
          if (comment.includes(keyword)) {
            issueCounts.set(category, (issueCounts.get(category) || 0) + 1);
            totalIssues++;
            categorized = true;
          }
        });
        
        if (!categorized) {
          issueCounts.set('Outros problemas', (issueCounts.get('Outros problemas') || 0) + 1);
          totalIssues++;
        }
      });

      const topIssues = Array.from(issueCounts.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / totalIssues) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalFeedback: metrics?.total_feedback || 0,
        satisfactionRate: metrics?.helpful_percentage || 0,
        trendDirection: 'stable', // Could be calculated from historical comparison
        modelPerformance,
        dailyTrends,
        topIssues
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Não foi possível carregar os dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics de Feedback</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(period)}
            >
              {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Feedbacks</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFeedback}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              Período selecionado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.satisfactionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.trendDirection === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : analytics.trendDirection === 'down' ? (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              ) : (
                <div className="w-3 h-3 mr-1" />
              )}
              {analytics.trendDirection === 'stable' ? 'Estável' : 
               analytics.trendDirection === 'up' ? 'Em alta' : 'Em baixa'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelos Ativos</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.modelPerformance.length}</div>
            <div className="text-xs text-muted-foreground">
              Com feedback no período
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principais Problemas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.topIssues.length}</div>
            <div className="text-xs text-muted-foreground">
              Categorias identificadas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Performance por Modelo</TabsTrigger>
          <TabsTrigger value="trends">Tendências Diárias</TabsTrigger>
          <TabsTrigger value="issues">Principais Problemas</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Performance dos Modelos
              </CardTitle>
              <CardDescription>
                Análise comparativa da satisfação dos usuários por modelo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.modelPerformance.map((model) => (
                  <div key={model.model} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full bg-gradient-to-t from-red-500 to-green-500" 
                           style={{ 
                             background: `linear-gradient(to top, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                             opacity: model.satisfaction / 100
                           }} />
                      <div>
                        <h3 className="font-medium">{model.model}</h3>
                        <p className="text-sm text-muted-foreground">
                          {model.totalFeedback} feedbacks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {model.satisfaction.toFixed(1)}%
                      </div>
                      <Badge variant={model.satisfaction >= 70 ? "default" : "destructive"}>
                        {model.satisfaction >= 70 ? "Bom" : "Precisa melhorar"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tendências Diárias
              </CardTitle>
              <CardDescription>
                Evolução do feedback ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.dailyTrends.slice(-10).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">{day.positive}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{day.negative}</span>
                      </div>
                      <span className="text-muted-foreground">
                        Total: {day.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Principais Problemas Reportados
              </CardTitle>
              <CardDescription>
                Categorização dos feedbacks negativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topIssues.map((issue, index) => (
                  <div key={issue.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 ? "bg-red-100 text-red-700" :
                        index === 1 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{issue.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {issue.percentage.toFixed(1)}% dos problemas
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {issue.count} ocorrências
                    </Badge>
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