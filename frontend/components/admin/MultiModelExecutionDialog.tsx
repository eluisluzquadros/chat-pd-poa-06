import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQAValidator } from '@/hooks/useQAValidator';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { UPDATED_MODEL_CONFIGS, ModelConfig } from '@/config/llm-models-2025';
import { supabase } from '@/integrations/supabase/client';

interface ModelDisplay extends ModelConfig {
  quality: number;
  speed: number;
  cost: number;
}

// Convert model configs to display format with calculated metrics
const AVAILABLE_MODELS: ModelDisplay[] = UPDATED_MODEL_CONFIGS
  .filter(config => config.available)
  .map(config => ({
    ...config,
    quality: Math.round(95 - (config.costPerOutputToken * 10000)), // Higher cost = lower quality estimation
    speed: config.averageLatency / 1000, // Convert ms to seconds
    cost: config.costPerOutputToken * 1000 // Convert to per 1K tokens
  }));

interface ExecutionStatus {
  model: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  runId?: string;
  accuracy?: number;
  responseTime?: number;
  error?: string;
}

export function MultiModelExecutionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [executions, setExecutions] = useState<ExecutionStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { runValidation } = useQAValidator();

  const handleModelToggle = (modelKey: string) => {
    setSelectedModels(prev => 
      prev.includes(modelKey) 
        ? prev.filter(m => m !== modelKey)
        : [...prev, modelKey]
    );
  };

  const handleSelectPreset = (preset: 'top-quality' | 'fastest' | 'cost-effective' | 'all') => {
    let models: string[] = [];
    
    switch (preset) {
      case 'top-quality':
        models = AVAILABLE_MODELS
          .sort((a, b) => b.quality - a.quality)
          .slice(0, 5)
          .map(m => `${m.provider}/${m.model}`);
        break;
      case 'fastest':
        models = AVAILABLE_MODELS
          .sort((a, b) => a.speed - b.speed)
          .slice(0, 5)
          .map(m => `${m.provider}/${m.model}`);
        break;
      case 'cost-effective':
        models = AVAILABLE_MODELS
          .sort((a, b) => a.cost - b.cost)
          .slice(0, 5)
          .map(m => `${m.provider}/${m.model}`);
        break;
      case 'all':
        models = AVAILABLE_MODELS.map(m => `${m.provider}/${m.model}`);
        break;
    }
    
    setSelectedModels(models);
  };

  const executeParallelValidation = async () => {
    if (selectedModels.length === 0) {
      toast.error('Selecione pelo menos um modelo para executar');
      return;
    }

    setIsRunning(true);
    const initialExecutions: ExecutionStatus[] = selectedModels.map(model => ({
      model,
      status: 'pending',
      progress: 0
    }));
    setExecutions(initialExecutions);

    try {
      // Use the new batch execution function via Supabase client
      const { data: result, error } = await supabase.functions.invoke('qa-batch-execution', {
        body: {
          models: selectedModels,
          options: {
            mode: 'random',
            categories: [],
            difficulties: [],
            randomCount: 10,
            includeSQL: true,
            excludeSQL: false
          }
        }
      });

      if (error) {
        throw new Error(`Batch execution failed: ${error.message}`);
      }
      
      if (result?.success) {
        // Update executions with real results
        const updatedExecutions: ExecutionStatus[] = selectedModels.map(model => {
          const modelResult = result.results.find((r: any) => r.model === model);
          return {
            model,
            status: (modelResult?.success ? 'completed' : 'failed') as 'completed' | 'failed',
            progress: 100,
            accuracy: modelResult?.summary?.avgAccuracy ? Math.round(modelResult.summary.avgAccuracy) : undefined,
            responseTime: modelResult?.summary?.avgResponseTime || undefined,
            error: modelResult?.error || undefined
          };
        });
        
        setExecutions(updatedExecutions);
        toast.success(`Execução concluída! ${result.summary.successfulModels}/${result.summary.totalModels} modelos executados com sucesso`);
      } else {
        throw new Error(result?.error || 'Batch execution failed');
      }

    } catch (error) {
      console.error('Erro na execução paralela:', error);
      // Mark all as failed
      setExecutions(prev => prev.map(exec => ({
        ...exec,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })));
      toast.error('Erro na execução paralela');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: ExecutionStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 95) return 'bg-green-100 text-green-800';
    if (quality >= 90) return 'bg-blue-100 text-blue-800';
    if (quality >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Play className="h-4 w-4 mr-2" />
          Execução Paralela
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execução Paralela de Múltiplos Modelos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Presets de Seleção */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('top-quality')}>
              Top 5 Qualidade
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('fastest')}>
              Top 5 Velocidade
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('cost-effective')}>
              Top 5 Custo-Benefício
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('all')}>
              Todos os Modelos
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedModels([])}>
              Limpar Seleção
            </Button>
          </div>

          {/* Lista de Modelos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_MODELS.map((model) => {
              const modelKey = `${model.provider}/${model.model}`;
              const isSelected = selectedModels.includes(modelKey);
              
              return (
                <Card 
                  key={modelKey} 
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleModelToggle(modelKey)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => handleModelToggle(modelKey)}
                      />
                      <CardTitle className="text-sm">{model.displayName}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Qualidade:</span>
                        <Badge className={getQualityColor(model.quality)}>
                          {model.quality}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Velocidade:</span>
                        <span>{model.speed}s</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Custo:</span>
                        <span>${model.cost}/1K</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Status de Execução */}
          {executions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Status da Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {executions.map((execution, index) => {
                    const model = AVAILABLE_MODELS.find(m => 
                      `${m.provider}/${m.model}` === execution.model
                    );
                    
                    return (
                      <div key={execution.model} className="flex items-center space-x-4 p-3 rounded-lg border">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {getStatusIcon(execution.status)}
                          <span className="font-medium">{model?.displayName}</span>
                          {execution.status === 'running' && (
                            <Progress value={execution.progress} className="flex-1 max-w-32" />
                          )}
                        </div>
                        
                        {execution.accuracy && (
                          <Badge variant="outline">
                            {execution.accuracy}% acerto
                          </Badge>
                        )}
                        
                        {execution.responseTime && (
                          <Badge variant="outline">
                            {execution.responseTime}ms
                          </Badge>
                        )}
                        
                        {execution.error && (
                          <Badge variant="destructive">
                            Erro
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedModels.length} modelo(s) selecionado(s)
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={executeParallelValidation}
                disabled={isRunning || selectedModels.length === 0}
              >
                {isRunning ? 'Executando...' : 'Iniciar Execução'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}