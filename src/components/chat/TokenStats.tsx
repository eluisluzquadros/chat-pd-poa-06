import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTokenTracking } from '@/hooks/useTokenTracking';
import { Activity, DollarSign, MessageSquare, Zap, TrendingUp, Calculator, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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
  const [customUsers, setCustomUsers] = useState<string>('100');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [currentProjection, setCurrentProjection] = useState<any>(null);
  const [qaTokenStats, setQaTokenStats] = useState<any>([]);
  const { getTokenUsageStats, TOKEN_PRICING } = useTokenTracking();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load chat token stats
      const data = await getTokenUsageStats();
      if (data) {
        setStats(data);
      }
      
      // Load cost projections
      const { data: projection } = await supabase
        .from('cost_projections')
        .select('*')
        .single();
      
      if (projection) {
        setCurrentProjection(projection);
      }
      
      // Load QA token stats
      const { data: qaStats } = await supabase
        .from('qa_validation_token_stats')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);
      
      if (qaStats) {
        setQaTokenStats(qaStats);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models">Por Modelo</TabsTrigger>
          <TabsTrigger value="projections">Projeções</TabsTrigger>
          <TabsTrigger value="qa-costs">Custos QA</TabsTrigger>
          <TabsTrigger value="pricing">Tabela de Preços</TabsTrigger>
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
        
        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projeção de Custos
              </CardTitle>
              <CardDescription>
                Estimativas baseadas no uso atual (Chat + QA)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Calculator */}
              <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="users">Número de Usuários</Label>
                  <Input
                    id="users"
                    type="number"
                    value={customUsers}
                    onChange={(e) => setCustomUsers(e.target.value)}
                    placeholder="Ex: 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo Principal</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(TOKEN_PRICING).map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Projections */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Projeção Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      ${calculateProjection(parseInt(customUsers) || 100).monthly.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Para {customUsers} usuários ativos
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Projeção Anual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      ${calculateProjection(parseInt(customUsers) || 100).yearly.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Economia em escala incluída
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Projections */}
              <div className="space-y-3">
                <h4 className="font-semibold">Projeções Rápidas</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {[10, 100, 1000, 10000].map(users => {
                    const proj = calculateProjection(users);
                    return (
                      <div key={users} className="p-3 border rounded-lg">
                        <div className="font-medium">{users} usuários</div>
                        <div className="text-sm text-muted-foreground">
                          Mensal: ${proj.monthly.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Anual: ${proj.yearly.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="qa-costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Custos de Validação QA
              </CardTitle>
              <CardDescription>
                Gastos com testes automatizados do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qaTokenStats.length > 0 ? (
                  qaTokenStats.map((stat: any) => (
                    <div key={stat.validation_run_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{stat.model}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(stat.started_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${stat.total_estimated_cost?.toFixed(4) || '0.00'}</p>
                          <p className="text-sm text-muted-foreground">
                            {stat.total_tests} testes • {stat.total_tokens} tokens
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span>Acurácia: {(stat.overall_accuracy * 100).toFixed(1)}%</span>
                        <span>Custo/teste: ${stat.avg_cost_per_test?.toFixed(4) || '0.00'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma validação QA executada ainda
                  </p>
                )}
              </div>
              
              {/* QA Cost Summary */}
              {qaTokenStats.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Resumo de Custos QA</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total gasto em QA:</span>
                      <span className="font-medium">
                        ${qaTokenStats.reduce((sum: number, stat: any) => sum + (stat.total_estimated_cost || 0), 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Média por validação:</span>
                      <span className="font-medium">
                        ${(qaTokenStats.reduce((sum: number, stat: any) => sum + (stat.total_estimated_cost || 0), 0) / qaTokenStats.length).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
  
  function calculateProjection(users: number) {
    if (currentProjection) {
      const costPerUser = (currentProjection.avg_daily_cost / currentProjection.avg_daily_users) * 30;
      return {
        monthly: costPerUser * users,
        yearly: costPerUser * users * 12
      };
    }
    
    // Fallback calculation
    const avgQueriesPerDay = 5;
    const avgTokensPerQuery = 500;
    const workingDaysPerMonth = 22;
    
    const monthlyQueries = users * avgQueriesPerDay * workingDaysPerMonth;
    const monthlyTokens = monthlyQueries * avgTokensPerQuery;
    
    const pricing = TOKEN_PRICING[selectedModel as keyof typeof TOKEN_PRICING] || TOKEN_PRICING['gpt-4o-mini'];
    const costPer1kTokens = pricing.input + pricing.output;
    const monthlyCost = (monthlyTokens / 1000) * costPer1kTokens;
    
    return {
      monthly: monthlyCost,
      yearly: monthlyCost * 12
    };
  }
}