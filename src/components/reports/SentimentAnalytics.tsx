import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Period, TimeRange } from "@/utils/dateUtils";
import { messageAnalysisService } from "@/services/messageAnalysisService";
import { Loader2 } from "lucide-react";

interface SentimentAnalyticsProps {
  period: Period;
  timeRange: TimeRange;
}

const SENTIMENT_COLORS = {
  positive: 'hsl(var(--chart-1))',
  negative: 'hsl(var(--chart-2))',
  neutral: 'hsl(var(--chart-3))',
};

// Cores sólidas como fallback para garantir visibilidade
const SOLID_COLORS = {
  positive: '#22c55e',  // green-500
  negative: '#ef4444',  // red-500
  neutral: '#3b82f6',   // blue-500
};

export function SentimentAnalytics({ period, timeRange }: SentimentAnalyticsProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const data = await messageAnalysisService.getSentimentStats(period);
      setStats(data);
      setIsLoading(false);
    };

    fetchStats();
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Sentimento</CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Execute o processamento de mensagens históricas para ver os dados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { 
      name: 'Positivo', 
      value: stats.positive, 
      color: SOLID_COLORS.positive,
      icon: '😊'
    },
    { 
      name: 'Negativo', 
      value: stats.negative, 
      color: SOLID_COLORS.negative,
      icon: '😞'
    },
    { 
      name: 'Neutro', 
      value: stats.neutral, 
      color: SOLID_COLORS.neutral,
      icon: '😐'
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Distribuição de Sentimento</CardTitle>
          <CardDescription>{stats.total} mensagens analisadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'hsl(var(--card-foreground))'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Métricas de Sentimento</CardTitle>
          <CardDescription>Distribuição de sentimentos nas conversas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Positivo */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl shrink-0">
                😊
              </div>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Positivo</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.positive} mensagens
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.positiveRate.toFixed(1)}%
            </span>
          </div>

          {/* Negativo */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-xl shrink-0">
                😞
              </div>
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Negativo</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {stats.negative} mensagens
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.negativeRate.toFixed(1)}%
            </span>
          </div>

          {/* Neutro */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl shrink-0">
                😐
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Neutro</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {stats.neutral} mensagens
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.neutralRate.toFixed(1)}%
            </span>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de mensagens analisadas</span>
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
