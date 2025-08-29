import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { ModelPerformance } from '@/hooks/useBenchmark';

interface BenchmarkChartsProps {
  modelPerformance: ModelPerformance[];
  qualityByModel: Array<{ model: string; quality: number }>;
  costByProvider: Array<{ provider: string; cost: number; count: number }>;
  isLoading: boolean;
}

export function BenchmarkCharts({ 
  modelPerformance, 
  qualityByModel, 
  costByProvider, 
  isLoading 
}: BenchmarkChartsProps) {
  
  // Prepare data for quality vs speed scatter plot
  const qualityVsSpeedData = modelPerformance.map(model => ({
    model: model.model,
    quality: model.avgQualityScore,
    speed: model.avgResponseTime,
    cost: model.avgCostPerQuery
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quality by Model Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Qualidade por Modelo (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={qualityByModel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="model" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                domain={[0, 100]}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Qualidade']}
                labelFormatter={(label) => `Modelo: ${label}`}
              />
              <Bar 
                dataKey="quality" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality vs Speed Scatter */}
      <Card>
        <CardHeader>
          <CardTitle>Qualidade vs Velocidade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={qualityVsSpeedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="speed" 
                name="Velocidade"
                type="number"
                domain={['dataMin', 'dataMax']}
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value)}ms`}
              />
              <YAxis 
                dataKey="quality" 
                name="Qualidade"
                type="number"
                domain={[0, 100]}
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Qualidade') return [`${value.toFixed(1)}%`, name];
                  if (name === 'Velocidade') return [`${Math.round(value)}ms`, name];
                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return `Modelo: ${payload[0].payload.model}`;
                  }
                  return '';
                }}
              />
              <Scatter 
                dataKey="quality" 
                fill="hsl(var(--primary))"
                r={6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost by Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Custo Médio por Provedor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByProvider}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="provider" 
                fontSize={12}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(4)}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(4)}`, 'Custo Médio por Query']}
                labelFormatter={(label) => `Provedor: ${label}`}
              />
              <Bar 
                dataKey="cost" 
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Speed Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Velocidade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelPerformance.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="model" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value)}ms`}
              />
              <Tooltip 
                formatter={(value: number) => [`${Math.round(value)}ms`, 'Tempo de Resposta']}
                labelFormatter={(label) => `Modelo: ${label}`}
              />
              <Bar 
                dataKey="avgResponseTime" 
                fill="hsl(var(--chart-3))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}