import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UPDATED_MODEL_CONFIGS, ModelConfig } from '@/config/llm-models-2025';
import { supabase } from '@/integrations/supabase/client';
import { Zap, DollarSign, Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ModelStats {
  provider: string;
  model: string;
  totalTests: number;
  avgAccuracy: number;
  avgResponseTime: number;
  totalCost: number;
  lastUsed?: string;
  status: 'active' | 'idle' | 'error';
}

interface ModelDashboardProps {
  onRunComparison?: (models: string[]) => void;
}

export function QAModelDashboard({ onRunComparison }: ModelDashboardProps) {
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'accuracy' | 'speed' | 'cost'>('accuracy');

  const fetchModelStats = async () => {
    try {
      setLoading(true);
      
      // Get stats from validation results grouped by model
      const { data: validationStats } = await supabase
        .from('qa_validation_results')
        .select('model, accuracy_score, response_time_ms, created_at');

      // Process stats by model
      const statsMap = new Map<string, ModelStats>();

      // Initialize all available models
      UPDATED_MODEL_CONFIGS.forEach(config => {
        const modelKey = `${config.provider}/${config.model}`;
        statsMap.set(modelKey, {
          provider: config.provider,
          model: config.model,
          totalTests: 0,
          avgAccuracy: 0,
          avgResponseTime: 0,
          totalCost: 0,
          status: 'idle'
        });
      });

      // Process validation results
      if (validationStats) {
        const modelGroups = validationStats.reduce((acc, result) => {
          if (!acc[result.model]) acc[result.model] = [];
          acc[result.model].push(result);
          return acc;
        }, {} as Record<string, any[]>);

        Object.entries(modelGroups).forEach(([modelKey, results]) => {
          const stats = statsMap.get(modelKey);
          if (stats) {
            stats.totalTests = results.length;
            stats.avgAccuracy = Math.round(
              results.reduce((sum, r) => sum + (r.accuracy_score || 0), 0) / results.length * 100
            );
            stats.avgResponseTime = Math.round(
              results.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / results.length
            );
            stats.lastUsed = results[0]?.created_at;
            stats.status = results.length > 0 ? 'active' : 'idle';
            
            // Estimate cost based on model config and token usage
            const config = UPDATED_MODEL_CONFIGS.find(c => c.model === stats.model);
            if (config) {
              // Rough estimate: assume 100 input + 50 output tokens per test
              const estimatedTokens = results.length * 150;
              stats.totalCost = estimatedTokens * (config.costPerInputToken + config.costPerOutputToken);
            }
          }
        });
      }

      setModelStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error fetching model stats:', error);
      toast.error('Erro ao carregar estatísticas dos modelos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'idle': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getSortedModels = () => {
    return [...modelStats].sort((a, b) => {
      switch (sortBy) {
        case 'accuracy':
          return b.avgAccuracy - a.avgAccuracy;
        case 'speed':
          return a.avgResponseTime - b.avgResponseTime;
        case 'cost':
          return a.totalCost - b.totalCost;
        default:
          return 0;
      }
    });
  };

  const handleModelSelection = (modelKey: string, selected: boolean) => {
    if (selected) {
      setSelectedModels(prev => [...prev, modelKey]);
    } else {
      setSelectedModels(prev => prev.filter(m => m !== modelKey));
    }
  };

  const handleRunComparison = () => {
    if (selectedModels.length < 2) {
      toast.error('Selecione pelo menos 2 modelos para comparação');
      return;
    }
    onRunComparison?.(selectedModels);
  };

  const getTotalStats = () => {
    const total = modelStats.reduce((acc, model) => ({
      tests: acc.tests + model.totalTests,
      cost: acc.cost + model.totalCost,
      active: acc.active + (model.status === 'active' ? 1 : 0)
    }), { tests: 0, cost: 0, active: 0 });

    return total;
  };

  const totalStats = getTotalStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Modelos LLM</h2>
          <p className="text-muted-foreground">Monitor de performance e custos dos 20 modelos disponíveis</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchModelStats}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button 
            onClick={handleRunComparison}
            disabled={selectedModels.length < 2}
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Comparar Selecionados ({selectedModels.length})
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelos Disponíveis</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{UPDATED_MODEL_CONFIGS.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.active} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testes Executados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.tests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total de validações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.cost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Gasto acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordenar Por</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accuracy">Acurácia</SelectItem>
                <SelectItem value="speed">Velocidade</SelectItem>
                <SelectItem value="cost">Custo</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando estatísticas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seleção</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Testes</TableHead>
                  <TableHead>Acurácia</TableHead>
                  <TableHead>Tempo Médio</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Último Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedModels().map((model) => {
                  const modelKey = `${model.provider}/${model.model}`;
                  const config = UPDATED_MODEL_CONFIGS.find(c => 
                    c.provider === model.provider && c.model === model.model
                  );
                  
                  return (
                    <TableRow key={modelKey}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(modelKey)}
                          onChange={(e) => handleModelSelection(modelKey, e.target.checked)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {config?.displayName || model.model}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(model.status)}>
                          {model.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{model.totalTests}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{model.avgAccuracy}%</span>
                          {model.totalTests > 0 && (
                            <Progress value={model.avgAccuracy} className="w-16 h-2" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {model.avgResponseTime}ms
                        </div>
                      </TableCell>
                      <TableCell>${model.totalCost.toFixed(4)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {model.lastUsed ? 
                          new Date(model.lastUsed).toLocaleDateString('pt-BR') : 
                          'Nunca'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}