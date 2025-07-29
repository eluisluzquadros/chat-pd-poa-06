import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Users, Calculator, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useTokenTracking } from "@/hooks/useTokenTracking";
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
} from "recharts";

interface CostProjection {
  activeUsers: number;
  avgQueriesPerUser: number;
  avgTokensPerQuery: number;
  monthlyCost: number;
  yearlyCost: number;
  costPerUser: number;
  costPerQuery: number;
}

interface TokenStats {
  date: string;
  totalTokens: number;
  totalCost: number;
  queryCount: number;
  activeUsers: number;
}

export function CostProjectionDashboard() {
  const { TOKEN_PRICING } = useTokenTracking();
  const [loading, setLoading] = useState(true);
  const [customUsers, setCustomUsers] = useState<string>("100");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [historicalData, setHistoricalData] = useState<TokenStats[]>([]);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [qaTokenStats, setQaTokenStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch current statistics
      const { data: stats } = await supabase
        .from('cost_projections')
        .select('*')
        .single();

      // Fetch historical token usage
      const { data: history } = await supabase
        .from('token_usage_summary')
        .select('*')
        .order('usage_date', { ascending: false })
        .limit(30);

      // Fetch QA token stats
      const { data: qaStats } = await supabase
        .from('qa_validation_token_stats')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      setCurrentStats(stats);
      setHistoricalData(history || []);
      setQaTokenStats(qaStats || []);
    } catch (error) {
      console.error('Error fetching cost data:', error);
      toast.error("Erro ao carregar dados de custo");
    } finally {
      setLoading(false);
    }
  };

  const calculateProjection = (users: number): CostProjection => {
    if (!currentStats) {
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
        activeUsers: users,
        avgQueriesPerUser: avgQueriesPerDay * workingDaysPerMonth,
        avgTokensPerQuery,
        monthlyCost,
        yearlyCost: monthlyCost * 12,
        costPerUser: monthlyCost / users,
        costPerQuery: monthlyCost / monthlyQueries
      };
    }

    // Use real data
    const avgQueriesPerUser = currentStats.avg_queries_per_user || 110;
    const avgTokensPerQuery = currentStats.avg_daily_tokens / currentStats.avg_daily_queries || 500;
    const costPerUser = (currentStats.avg_daily_cost / currentStats.avg_daily_users) * 30;
    
    return {
      activeUsers: users,
      avgQueriesPerUser: avgQueriesPerUser * 30,
      avgTokensPerQuery,
      monthlyCost: costPerUser * users,
      yearlyCost: costPerUser * users * 12,
      costPerUser,
      costPerQuery: costPerUser / (avgQueriesPerUser * 30)
    };
  };

  const projection = calculateProjection(parseInt(customUsers) || 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value * 5.5); // Convert USD to BRL
  };

  const pieData = [
    { name: 'Input Tokens', value: 30, color: '#3b82f6' },
    { name: 'Output Tokens', value: 70, color: '#10b981' }
  ];

  const userProjections = [
    { users: 10, ...calculateProjection(10) },
    { users: 100, ...calculateProjection(100) },
    { users: 1000, ...calculateProjection(1000) },
    { users: 10000, ...calculateProjection(10000) }
  ];

  if (loading) {
    return <div className="p-6">Carregando dashboard de custos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Projeção de Custos</h2>
          <p className="text-muted-foreground">
            Estimativas baseadas em uso real e simulações
          </p>
        </div>
        
        <Button onClick={fetchData} variant="outline">
          Atualizar Dados
        </Button>
      </div>

      {/* Current Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio/Usuário</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(projection.costPerUser)}</div>
            <p className="text-xs text-muted-foreground">Por mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo/Consulta</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(projection.costPerQuery)}</div>
            <p className="text-xs text-muted-foreground">Média geral</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens/Consulta</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(projection.avgTokensPerQuery)}</div>
            <p className="text-xs text-muted-foreground">Input + Output</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas/Usuário</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(projection.avgQueriesPerUser)}</div>
            <p className="text-xs text-muted-foreground">Por mês</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projection">Projeções</TabsTrigger>
          <TabsTrigger value="historical">Histórico</TabsTrigger>
          <TabsTrigger value="qa-costs">Custos QA</TabsTrigger>
          <TabsTrigger value="simulator">Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="projection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Custos por Número de Usuários</CardTitle>
              <CardDescription>
                Estimativas mensais e anuais baseadas em padrões de uso atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userProjections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="users" />
                    <YAxis tickFormatter={(value) => `R$ ${(value * 5.5).toFixed(0)}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="monthlyCost" name="Custo Mensal" fill="#3b82f6" />
                    <Bar dataKey="yearlyCost" name="Custo Anual" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {userProjections.map((proj) => (
                  <Card key={proj.users}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{proj.users} Usuários</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mensal:</span>
                        <span className="font-semibold">{formatCurrency(proj.monthlyCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Anual:</span>
                        <span className="font-semibold">{formatCurrency(proj.yearlyCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Por usuário:</span>
                        <span>{formatCurrency(proj.costPerUser)}/mês</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Uso de Tokens</CardTitle>
              <CardDescription>Últimos 30 dias de consumo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="usage_date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="total_tokens" stroke="#3b82f6" name="Tokens" />
                    <Line yAxisId="right" type="monotone" dataKey="total_cost" stroke="#10b981" name="Custo (USD)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa-costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custos de Validação QA</CardTitle>
              <CardDescription>Gastos com testes automatizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qaTokenStats.map((stat: any) => (
                  <div key={stat.validation_run_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{stat.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(stat.started_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(stat.total_estimated_cost)}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.total_tests} testes • {stat.total_tokens} tokens
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span>Acurácia: {(stat.overall_accuracy * 100).toFixed(1)}%</span>
                      <span>Custo/teste: {formatCurrency(stat.avg_cost_per_test)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Custos</CardTitle>
              <CardDescription>
                Calcule projeções personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Mensal Estimado</p>
                      <p className="text-3xl font-bold">{formatCurrency(projection.monthlyCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Anual Estimado</p>
                      <p className="text-3xl font-bold">{formatCurrency(projection.yearlyCost)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-3">Breakdown Detalhado</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Consultas totais/mês:</span>
                        <span>{Math.round(projection.activeUsers * projection.avgQueriesPerUser)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tokens totais/mês:</span>
                        <span>{Math.round(projection.activeUsers * projection.avgQueriesPerUser * projection.avgTokensPerQuery).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo por usuário:</span>
                        <span>{formatCurrency(projection.costPerUser)}/mês</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo por consulta:</span>
                        <span>{formatCurrency(projection.costPerQuery)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-3">Distribuição de Custos</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}