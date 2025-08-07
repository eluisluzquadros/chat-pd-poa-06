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
import { useQAValidator } from '@/hooks/useQAValidator';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface ValidationOptions {
  model: string;
  mode: 'all' | 'selected' | 'filtered' | 'random';
  testCaseIds?: string[];
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

interface ValidationOptionsDialogProps {
  onValidationComplete?: () => void;
}

export function ValidationOptionsDialog({ onValidationComplete }: ValidationOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ValidationOptions>({
    model: 'agentic-rag',
    mode: 'all',
    includeSQL: true,
    excludeSQL: false
  });
  
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [testCaseCount, setTestCaseCount] = useState(0);
  
  const { runValidation, isRunning, progress } = useQAValidator();

  const models = [
    { value: 'agentic-rag', label: 'Agentic RAG (Padrão)' },
    { value: 'claude-chat', label: 'Claude Chat' },
    { value: 'gemini-chat', label: 'Gemini Chat' },
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'groq-chat', label: 'Groq Chat' }
  ];

  // Fetch available categories and difficulties
  useEffect(() => {
    const fetchMetadata = async () => {
      const { data } = await supabase
        .from('qa_test_cases')
        .select('category, difficulty')
        .eq('is_active', true);

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));
        const uniqueDifficulties = Array.from(new Set(data.map(item => item.difficulty).filter(Boolean)));
        
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

      if (options.categories && options.categories.length > 0) {
        query = query.in('category', options.categories);
      }

      if (options.difficulties && options.difficulties.length > 0) {
        query = query.in('difficulty', options.difficulties);
      }

      if (options.excludeSQL) {
        query = query.eq('is_sql_related', false);
      }

      const { count } = await query;
      setTestCaseCount(count || 0);
    };

    countTestCases();
  }, [options.categories, options.difficulties, options.excludeSQL]);

  const handleExecute = async () => {
    try {
      await runValidation(options);
      setOpen(false);
      onValidationComplete?.();
    } catch (error) {
      console.error('Error running validation:', error);
    }
  };

  const getEstimatedTime = () => {
    const baseTime = testCaseCount * 3; // 3 seconds per test case
    return Math.round(baseTime / 60); // Convert to minutes
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Play className="h-4 w-4" />
          Executar Validação QA
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Validação QA
          </DialogTitle>
        </DialogHeader>

        {isRunning && progress ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Executando Validação...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso: {progress.current} de {progress.total}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="w-full" />
              </div>
              <Badge variant="secondary" className="w-fit">
                Modelo: {options.model}
              </Badge>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Modelo</Label>
              <Select value={options.model} onValueChange={(value) => setOptions(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Execution Mode */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Modo de Execução</Label>
              <Select value={options.mode} onValueChange={(value: any) => setOptions(prev => ({ ...prev, mode: value }))}>
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
            {(options.mode === 'filtered' || options.mode === 'random') && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Categorias</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          checked={options.categories?.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setOptions(prev => ({
                                ...prev,
                                categories: [...(prev.categories || []), category]
                              }));
                            } else {
                              setOptions(prev => ({
                                ...prev,
                                categories: prev.categories?.filter(c => c !== category)
                              }));
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
                          checked={options.difficulties?.includes(difficulty)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setOptions(prev => ({
                                ...prev,
                                difficulties: [...(prev.difficulties || []), difficulty]
                              }));
                            } else {
                              setOptions(prev => ({
                                ...prev,
                                difficulties: prev.difficulties?.filter(d => d !== difficulty)
                              }));
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
            {options.mode === 'random' && (
              <div className="space-y-3">
                <Label>Quantidade de Casos</Label>
                <Input
                  type="number"
                  placeholder="Ex: 10"
                  value={options.randomCount || ''}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    randomCount: parseInt(e.target.value) || undefined 
                  }))}
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
                    checked={!options.excludeSQL}
                    onCheckedChange={(checked) => setOptions(prev => ({ 
                      ...prev, 
                      excludeSQL: !checked,
                      includeSQL: checked as boolean
                    }))}
                  />
                  <Label>Incluir casos relacionados a SQL</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Execução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Casos de teste:</span>
                  <Badge variant="outline">{testCaseCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tempo estimado:</span>
                  <Badge variant="outline">{getEstimatedTime()} min</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Modelo:</span>
                  <Badge>{models.find(m => m.value === options.model)?.label}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleExecute} disabled={testCaseCount === 0} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Executar Validação
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