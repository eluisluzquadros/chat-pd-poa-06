import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Play, Settings } from 'lucide-react';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { Progress } from '@/components/ui/progress';

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

  const availableModels = UPDATED_MODEL_CONFIGS
    .filter(config => config.available)
    .map(config => ({
      value: config.model,
      label: config.displayName,
      provider: config.provider,
      cost: config.costPerInputToken + config.costPerOutputToken
    }));

  const handleModelToggle = (modelValue: string, checked: boolean) => {
    if (checked) {
      setSelectedModels(prev => [...prev, modelValue]);
    } else {
      setSelectedModels(prev => prev.filter(m => m !== modelValue));
    }
  };

  const handleExecute = async () => {
    if (selectedModels.length === 0) return;
    
    try {
      await onExecute({ models: selectedModels });
      setOpen(false);
    } catch (error) {
      console.error('Error executing benchmark:', error);
    }
  };

  const getEstimatedTime = () => {
    const testCasesPerModel = 5; // From our configuration
    const secondsPerTest = 3;
    const totalTime = selectedModels.length * testCasesPerModel * secondsPerTest;
    return Math.round(totalTime / 60); // Convert to minutes
  };

  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

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
            {/* Model Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Selecionar Modelos para Benchmark</Label>
              
              {Object.entries(groupedModels).map(([provider, models]) => (
                <Card key={provider}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg capitalize">{provider}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {models.map(model => (
                        <div key={model.value} className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedModels.includes(model.value)}
                            onCheckedChange={(checked) => handleModelToggle(model.value, checked as boolean)}
                          />
                          <div className="flex-1 min-w-0">
                            <Label className="text-sm font-medium">{model.label}</Label>
                            <div className="text-xs text-muted-foreground">
                              Custo: ${(model.cost * 1000).toFixed(4)}/1K tokens
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
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