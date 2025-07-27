import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTokenTracking } from '@/hooks/useTokenTracking';
import { Activity, DollarSign, MessageSquare, Zap } from 'lucide-react';

interface TokenStatsData {
  user_id: string;
  model: string;
  usage_date: string;
  message_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
}

export function TokenStats() {
  const [stats, setStats] = useState<TokenStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTokenUsageStats, TOKEN_PRICING } = useTokenTracking();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getTokenUsageStats();
      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading token stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return stats.reduce(
      (acc, stat) => ({
        messages: acc.messages + stat.message_count,
        tokens: acc.tokens + stat.total_tokens,
        cost: acc.cost + stat.total_cost,
      }),
      { messages: 0, tokens: 0, cost: 0 }
    );
  };

  const getModelStats = () => {
    const modelStats = stats.reduce((acc, stat) => {
      if (!acc[stat.model]) {
        acc[stat.model] = {
          messages: 0,
          tokens: 0,
          cost: 0,
        };
      }
      acc[stat.model].messages += stat.message_count;
      acc[stat.model].tokens += stat.total_tokens;
      acc[stat.model].cost += stat.total_cost;
      return acc;
    }, {} as Record<string, { messages: number; tokens: number; cost: number }>);

    return Object.entries(modelStats);
  };

  const totals = getTotalStats();
  const modelStats = getModelStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totals.messages}</div>
            <p className="text-xs text-muted-foreground">
              conversas processadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totals.tokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              tokens processados
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${totals.cost.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              custo total estimado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="models">Por Modelo</TabsTrigger>
          <TabsTrigger value="pricing">Preços</TabsTrigger>
        </TabsList>
        
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Estatísticas por Modelo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelStats.map(([model, stats]) => (
                  <div key={model} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {model}
                      </Badge>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {stats.messages} mensagens • {stats.tokens.toLocaleString()} tokens
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Custo estimado: ${stats.cost.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tabela de Preços (por 1K tokens)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(TOKEN_PRICING).map(([model, pricing]) => (
                  <div key={model} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <Badge variant="outline" className="font-mono">
                      {model}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Input: ${pricing.input} • Output: ${pricing.output}
                    </div>
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