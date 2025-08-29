import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Crown, Zap, DollarSign } from 'lucide-react';
import { ModelPerformance } from '@/hooks/useBenchmark';

interface BenchmarkModelTableProps {
  modelPerformance: {
    provider: string;
    model: string;
    avgQualityScore: number;
    avgResponseTime: number;
    avgCostPerQuery: number;
    successRate: number;
    totalTests: number;
    recommendation: string;
  }[];
  onViewResults?: (model: any) => void;
}

export function BenchmarkModelTable({ modelPerformance, onViewResults }: BenchmarkModelTableProps) {
  const [sortBy, setSortBy] = useState<'quality' | 'speed' | 'cost'>('quality');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  const providers = Array.from(new Set(modelPerformance.map(m => m.provider)));

  const filteredModels = modelPerformance
    .filter(model => filterProvider === 'all' || model.provider === filterProvider)
    .sort((a, b) => {
      switch (sortBy) {
        case 'quality':
          return b.avgQualityScore - a.avgQualityScore;
        case 'speed':
          return a.avgResponseTime - b.avgResponseTime;
        case 'cost':
          return a.avgCostPerQuery - b.avgCostPerQuery;
        default:
          return 0;
      }
    });

  const getRecommendationBadge = (model: any, index: number) => {
    // Best in each category badges
    const badges = [];
    
    // Check if it's the best in quality
    const bestQuality = modelPerformance.reduce((best, current) => 
      current.avgQualityScore > best.avgQualityScore ? current : best
    );
    if (model.model === bestQuality.model) {
      badges.push(
        <Badge key="quality" variant="default" className="bg-yellow-500">
          <Crown className="w-3 h-3 mr-1" />
          Melhor Qualidade
        </Badge>
      );
    }

    // Check if it's the fastest
    const fastest = modelPerformance.reduce((fast, current) => 
      current.avgResponseTime < fast.avgResponseTime ? current : fast
    );
    if (model.model === fastest.model) {
      badges.push(
        <Badge key="speed" variant="secondary" className="bg-blue-500 text-white">
          <Zap className="w-3 h-3 mr-1" />
          Mais Rápido
        </Badge>
      );
    }

    // Check if it's the most economical
    const cheapest = modelPerformance.reduce((cheap, current) => 
      current.avgCostPerQuery < cheap.avgCostPerQuery ? current : cheap
    );
    if (model.model === cheapest.model) {
      badges.push(
        <Badge key="cost" variant="outline" className="border-green-500 text-green-700">
          <DollarSign className="w-3 h-3 mr-1" />
          Mais Econômico
        </Badge>
      );
    }

    // General recommendations based on use case
    if (model.recommendation) {
      badges.push(
        <Badge key="rec" variant="outline" className="text-xs">
          {model.recommendation}
        </Badge>
      );
    }

    return badges;
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 75) return 'text-blue-600 font-semibold';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpeedColor = (time: number) => {
    if (time <= 1000) return 'text-green-600 font-bold';
    if (time <= 2000) return 'text-blue-600 font-semibold';
    if (time <= 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCostColor = (cost: number) => {
    if (cost <= 0.001) return 'text-green-600 font-bold';
    if (cost <= 0.005) return 'text-blue-600 font-semibold';
    if (cost <= 0.01) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!modelPerformance || modelPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum modelo encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Execute um benchmark primeiro para ver os resultados dos modelos.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Desempenho Detalhado dos Modelos</CardTitle>
          <div className="flex gap-2">
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Provedores</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'quality' | 'speed' | 'cost') => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quality">
                  <div className="flex items-center">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Por Qualidade
                  </div>
                </SelectItem>
                <SelectItem value="speed">
                  <div className="flex items-center">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Por Velocidade
                  </div>
                </SelectItem>
                <SelectItem value="cost">
                  <div className="flex items-center">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Por Custo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Provedor</TableHead>
              <TableHead className="text-center">Qualidade</TableHead>
              <TableHead className="text-center">Velocidade</TableHead>
              <TableHead className="text-center">Custo</TableHead>
              <TableHead className="text-center">Taxa Sucesso</TableHead>
              <TableHead>Recomendações</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModels.map((model, index) => (
              <TableRow key={`${model.provider}-${model.model}`}>
                <TableCell className="font-semibold">{model.model}</TableCell>
                <TableCell>
                  <Badge variant="outline">{model.provider}</Badge>
                </TableCell>
                <TableCell className={`text-center ${getQualityColor(model.avgQualityScore)}`}>
                  {model.avgQualityScore.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-center ${getSpeedColor(model.avgResponseTime)}`}>
                  {model.avgResponseTime.toLocaleString()}ms
                </TableCell>
                <TableCell className={`text-center ${getCostColor(model.avgCostPerQuery)}`}>
                  ${model.avgCostPerQuery.toFixed(4)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={model.successRate >= 80 ? 'default' : 'destructive'}>
                    {model.successRate}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getRecommendationBadge(model, index)}
                  </div>
                </TableCell>
                <TableCell>
                  {onViewResults && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewResults(model)}
                      className="text-xs"
                    >
                      Ver Respostas
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum modelo encontrado com os filtros aplicados.
          </div>
        )}
      </CardContent>
    </Card>
  );
}