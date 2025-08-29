import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Play, Settings } from 'lucide-react';
import { UPDATED_MODEL_CONFIGS, ModelConfig } from '@/config/llm-models-2025';
import { Progress } from '@/components/ui/progress';
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

interface BenchmarkOptions {
  models: string[];
  mode: 'all' | 'filtered' | 'random';
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
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
  const [executionMode, setExecutionMode] = useState<'all' | 'filtered' | 'random'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState<number>(10);
  const [includeSQL, setIncludeSQL] = useState(true);
  const [excludeSQL, setExcludeSQL] = useState(false);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [testCaseCount, setTestCaseCount] = useState(121);

  const availableModels = AVAILABLE_MODELS.map(model => ({
    value: model.model,
    label: model.displayName,
    provider: model.provider,
    cost: model.cost,
    quality: model.quality,
    speed: model.speed
  }));

  // Fetch available categories and difficulties
  useEffect(() => {
    const fetchMetadata = async () => {
      const { data } = await supabase
        .from('qa_test_cases')
        .select('category, difficulty, complexity')
        .eq('is_active', true);

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));
        const uniqueDifficulties = Array.from(new Set(data.map(item => item.difficulty || item.complexity).filter(Boolean)));
        
        setCategories(uniqueCategories);
        setDifficulties(uniqueDifficulties);
      }
    };

    fetchMetadata();
  }, []);

  // Count test cases based on current filters
  useEffect(() => {
    const countTestCases = async () => {
      let query = supabase
        .from('qa_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (executionMode === 'filtered') {
        if (selectedCategories.length > 0) {
          query = query.in('category', selectedCategories);
        }

        if (selectedDifficulties.length > 0) {
          query = query.in('difficulty', selectedDifficulties);
        }
      }

      if (excludeSQL) {
        query = query.eq('is_sql_related', false);
      }

      const { count } = await query;
      setTestCaseCount(count || 0);
    };

    countTestCases();
  }, [executionMode, selectedCategories, selectedDifficulties, excludeSQL]);

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
      const options: BenchmarkOptions = {
        models: selectedModels,
        mode: executionMode,
        categories: executionMode === 'filtered' ? selectedCategories : undefined,
        difficulties: executionMode === 'filtered' ? selectedDifficulties : undefined,
        randomCount: executionMode === 'random' ? randomCount : undefined,
        includeSQL,
        excludeSQL
      };
      
      console.log('Executing benchmark with options:', options);
      await onExecute(options);
      // Close dialog after successful execution
      setTimeout(() => setOpen(false), 1000);
    } catch (error) {
      console.error('Error executing benchmark:', error);
      setOpen(false);
    }
  };

  const getEstimatedTime = () => {
    let casesToTest = testCaseCount;
    if (executionMode === 'random' && randomCount) {
      casesToTest = Math.min(randomCount, testCaseCount);
    }
    const secondsPerTest = 3;
    const totalTime = selectedModels.length * casesToTest * secondsPerTest;
    return Math.round(totalTime / 60); // Convert to minutes
  };

  const getTestCasesToRun = () => {
    if (executionMode === 'random' && randomCount) {
      return Math.min(randomCount, testCaseCount);
    }
    return testCaseCount;
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
            {/* Execution Mode */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Modo de Execução</Label>
              <Select value={executionMode} onValueChange={(value: any) => setExecutionMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os casos ativos</SelectItem>
                  <SelectItem value="filtered">Filtrados por categoria/dificuldade</SelectItem>
                  <SelectItem value="random">Amostra aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters */}
            {(executionMode === 'filtered' || executionMode === 'random') && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Categorias</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories(prev => [...prev, category]);
                            } else {
                              setSelectedCategories(prev => prev.filter(c => c !== category));
                            }
                          }}
                        />
                        <Label className="text-sm">{category}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Dificuldades</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {difficulties.map(difficulty => (
                      <div key={difficulty} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedDifficulties.includes(difficulty)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDifficulties(prev => [...prev, difficulty]);
                            } else {
                              setSelectedDifficulties(prev => prev.filter(d => d !== difficulty));
                            }
                          }}
                        />
                        <Label className="text-sm">{difficulty}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Random Count */}
            {executionMode === 'random' && (
              <div className="space-y-3">
                <Label>Quantidade de Casos</Label>
                <Input
                  type="number"
                  placeholder="Ex: 10"
                  value={randomCount}
                  onChange={(e) => setRandomCount(parseInt(e.target.value) || 10)}
                />
              </div>
            )}

            <Separator />

            {/* SQL Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Casos SQL</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={!excludeSQL}
                    onCheckedChange={(checked) => {
                      setExcludeSQL(!checked);
                      setIncludeSQL(checked as boolean);
                    }}
                  />
                  <Label>Incluir casos relacionados a SQL</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Filter Buttons */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Seleção Rápida de Modelos</Label>
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
                  <Badge variant="outline">{getTestCasesToRun()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total de execuções:</span>
                  <Badge variant="outline">{selectedModels.length * getTestCasesToRun()}</Badge>
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