import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, DollarSign, Zap, Database } from 'lucide-react';

interface TokenUsageRecord {
  model: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

interface DailyStats {
  date: string;
  total_tokens: number;
  total_cost: number;
  requests: number;
}

interface ModelStats {
  model: string;
  total_tokens: number;
  total_cost: number;
  requests: number;
}

// Pricing per 1K tokens (updated Jan 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

export function TokenStats() {
  const { data: tokenData, isLoading, error } = useQuery({
    queryKey: ['token-usage-stats'],
    queryFn: async () => {
      // Buscar dados dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TokenUsageRecord[];
    },
    staleTime: 60000, // 1 minuto
  });

  const { data: llmMetricsData } = useQuery({
    queryKey: ['llm-metrics-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('llm_metrics')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Erro ao carregar estatísticas de tokens: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  const records = tokenData || [];
  const llmRecords = llmMetricsData || [];

  // Calcular estatísticas totais
  const totalTokens = records.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  const totalRequests = records.length;
  
  // Recalcular custos corretamente
  const totalCost = records.reduce((sum, r) => {
    if (r.estimated_cost > 0) return sum + Number(r.estimated_cost);
    return sum + calculateCost(r.model, r.input_tokens || 0, r.output_tokens || 0);
  }, 0);

  // Adicionar métricas de llm_metrics
  const llmTotalTokens = llmRecords.reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0);
  const llmTotalCost = llmRecords.reduce((sum: number, r: any) => sum + Number(r.cost || 0), 0);

  // Agrupar por dia
  const dailyStats: Record<string, DailyStats> = {};
  records.forEach(r => {
    const date = new Date(r.created_at).toLocaleDateString('pt-BR');
    if (!dailyStats[date]) {
      dailyStats[date] = { date, total_tokens: 0, total_cost: 0, requests: 0 };
    }
    dailyStats[date].total_tokens += r.total_tokens || 0;
    dailyStats[date].total_cost += r.estimated_cost > 0 
      ? Number(r.estimated_cost) 
      : calculateCost(r.model, r.input_tokens || 0, r.output_tokens || 0);
    dailyStats[date].requests += 1;
  });

  const dailyChartData = Object.values(dailyStats)
    .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
    .slice(-14); // Últimos 14 dias

  // Agrupar por modelo
  const modelStats: Record<string, ModelStats> = {};
  records.forEach(r => {
    // Normalizar nome do modelo (remover UUIDs)
    let modelName = r.model;
    if (modelName && modelName.match(/^[a-f0-9-]{36}$/i)) {
      modelName = 'agent-uuid'; // Placeholder para UUIDs
    }
    
    if (!modelStats[modelName]) {
      modelStats[modelName] = { model: modelName, total_tokens: 0, total_cost: 0, requests: 0 };
    }
    modelStats[modelName].total_tokens += r.total_tokens || 0;
    modelStats[modelName].total_cost += r.estimated_cost > 0 
      ? Number(r.estimated_cost) 
      : calculateCost(modelName, r.input_tokens || 0, r.output_tokens || 0);
    modelStats[modelName].requests += 1;
  });

  const modelChartData = Object.values(modelStats)
    .sort((a, b) => b.total_tokens - a.total_tokens)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalTokens + llmTotalTokens).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalCost + llmTotalCost).toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado em preços OpenAI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalRequests + llmRecords.length).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Chat + Edge Functions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Request</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRequests > 0 
                ? Math.round(totalTokens / totalRequests).toLocaleString('pt-BR')
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              tokens/request
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumo diário */}
        <Card>
          <CardHeader>
            <CardTitle>Consumo Diário de Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'total_tokens' 
                        ? value.toLocaleString('pt-BR') + ' tokens'
                        : '$' + value.toFixed(4),
                      name === 'total_tokens' ? 'Tokens' : 'Custo'
                    ]}
                  />
                  <Bar dataKey="total_tokens" fill="#8884d8" name="total_tokens" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uso por modelo */}
        <Card>
          <CardHeader>
            <CardTitle>Uso por Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            {modelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={modelChartData}
                    dataKey="total_tokens"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ model, percent }) => 
                      `${model}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {modelChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [
                      value.toLocaleString('pt-BR') + ' tokens',
                      'Total'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de uso recente */}
      <Card>
        <CardHeader>
          <CardTitle>Uso Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Modelo</th>
                  <th className="text-right p-2">Input</th>
                  <th className="text-right p-2">Output</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Custo</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map((r, i) => {
                  const cost = r.estimated_cost > 0 
                    ? Number(r.estimated_cost) 
                    : calculateCost(r.model, r.input_tokens || 0, r.output_tokens || 0);
                  
                  return (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {new Date(r.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {r.model?.length > 20 ? r.model.substring(0, 20) + '...' : r.model}
                      </td>
                      <td className="text-right p-2">{(r.input_tokens || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right p-2">{(r.output_tokens || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right p-2 font-medium">{(r.total_tokens || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right p-2 text-muted-foreground">${cost.toFixed(6)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro de uso encontrado nos últimos 30 dias.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
