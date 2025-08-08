import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Play, Settings } from 'lucide-react';
import { UPDATED_MODEL_CONFIGS, ModelConfig } from '@/config/llm-models-2025';
import { Progress } from '@/components/ui/progress';

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

interface BenchmarkOptions {
  models: string[];
}

interface BenchmarkOptionsDialogProps {
  onExecute: (options: BenchmarkOptions) => Promise<void>;
  isRunning: boolean;
  progress?: { current: number; total: number; percentage: number };
}

export function BenchmarkOptionsDialog({ onExecute, isRunning, progress }: BenchmarkOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'gpt-4o-mini-2024-07-18',
    'claude-3-5-sonnet-20241022',
    'gemini-1.5-flash-002'
  ]);

  const availableModels = AVAILABLE_MODELS.map(model => ({
    value: model.model,
    label: model.displayName,
    provider: model.provider,
    cost: model.cost,
    quality: model.quality,
    speed: model.speed
  }));

  const handleModelToggle = (modelValue: string, checked: boolean) => {
    if (checked) {
      setSelectedModels(prev => [...prev, modelValue]);
    } else {
      setSelectedModels(prev => prev.filter(m => m !== modelValue));
    }
  };

  const handleSelectPreset = (preset: 'top-quality' | 'fastest' | 'cost-effective' | 'all' | 'clear') => {
    let models: string[] = [];
    
    switch (preset) {
      case 'top-quality':
        models = AVAILABLE_MODELS
          .sort((a, b) => b.quality - a.quality)
          .slice(0, 5)
          .map(m => m.model);
        break;
      case 'fastest':
        models = AVAILABLE_MODELS
          .sort((a, b) => a.speed - b.speed)
          .slice(0, 5)
          .map(m => m.model);
        break;
      case 'cost-effective':
        models = AVAILABLE_MODELS
          .sort((a, b) => a.cost - b.cost)
          .slice(0, 5)
          .map(m => m.model);
        break;
      case 'all':
        models = AVAILABLE_MODELS.map(m => m.model);
        break;
      case 'clear':
        models = [];
        break;
    }
    
    setSelectedModels(models);
  };

  const handleExecute = async () => {
    if (selectedModels.length === 0) return;
    
    try {
      await onExecute({ models: selectedModels });
      // Keep dialog open to show progress, it will close automatically when benchmark completes
    } catch (error) {
      console.error('Error executing benchmark:', error);
      setOpen(false);
    }
  };

  const getEstimatedTime = () => {
    const testCasesPerModel = 5; // From our configuration
    const secondsPerTest = 3;
    const totalTime = selectedModels.length * testCasesPerModel * secondsPerTest;
    return Math.round(totalTime / 60); // Convert to minutes
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 95) return 'bg-green-100 text-green-800';
    if (quality >= 90) return 'bg-blue-100 text-blue-800';
    if (quality >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Play className="h-4 w-4" />
          Executar Benchmark
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Benchmark de Modelos
          </DialogTitle>
        </DialogHeader>

        {isRunning && progress ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Executando Benchmark...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso: {progress.current} de {progress.total}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map(modelValue => {
                  const model = availableModels.find(m => m.value === modelValue);
                  return (
                    <Badge key={modelValue} variant="secondary">
                      {model?.label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filter Buttons */}
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
              <Button variant="outline" size="sm" onClick={() => handleSelectPreset('clear')}>
                Limpar Seleção
              </Button>
            </div>

            {/* Model Selection Grid */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Selecionar Modelos para Benchmark</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableModels.map((model) => {
                  const isSelected = selectedModels.includes(model.value);
                  
                  return (
                    <Card 
                      key={model.value} 
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleModelToggle(model.value, !isSelected)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={isSelected}
                            onChange={() => handleModelToggle(model.value, !isSelected)}
                          />
                          <CardTitle className="text-sm">{model.label}</CardTitle>
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
                            <span>${model.cost.toFixed(4)}/1K</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Execução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Modelos selecionados:</span>
                  <Badge variant="outline">{selectedModels.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Casos de teste por modelo:</span>
                  <Badge variant="outline">5</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tempo estimado:</span>
                  <Badge variant="outline">{getEstimatedTime()} min</Badge>
                </div>
                
                {selectedModels.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-sm font-medium">Modelos que serão testados:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedModels.map(modelValue => {
                        const model = availableModels.find(m => m.value === modelValue);
                        return (
                          <Badge key={modelValue} variant="secondary" className="text-xs">
                            {model?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleExecute} 
                disabled={selectedModels.length === 0} 
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Executar Benchmark ({selectedModels.length} modelos)
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}