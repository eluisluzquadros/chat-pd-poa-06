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
    { name: 'Positivo', value: stats.positive, color: SENTIMENT_COLORS.positive },
    { name: 'Negativo', value: stats.negative, color: SENTIMENT_COLORS.negative },
    { name: 'Neutro', value: stats.neutral, color: SENTIMENT_COLORS.neutral },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Sentimento</CardTitle>
          <CardDescription>{stats.total} mensagens analisadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas de Sentimento</CardTitle>
          <CardDescription>Estatísticas gerais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Taxa de Satisfação</span>
            <span className="text-2xl font-bold text-green-600">
              {stats.positiveRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Taxa Negativa</span>
            <span className="text-2xl font-bold text-red-600">
              {stats.negativeRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Taxa Neutra</span>
            <span className="text-2xl font-bold text-gray-600">
              {stats.neutralRate.toFixed(1)}%
            </span>
          </div>
          <div className="pt-4 border-t">
            <span className="text-sm text-muted-foreground">Total de mensagens:</span>
            <span className="ml-2 text-lg font-semibold">{stats.total}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
