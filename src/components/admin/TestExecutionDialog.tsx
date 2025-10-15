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
import { Play, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Agent = Database['public']['Tables']['dify_agents']['Row'];

interface TestConfig {
  models: string[];
  mode: 'all' | 'filtered' | 'random';
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

interface TestExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (config: TestConfig) => Promise<void>;
  agents: Agent[];
  isRunning: boolean;
  progress?: { current: number; total: number; percentage: number };
}

export function TestExecutionDialog({ 
  open, 
  onOpenChange, 
  onExecute, 
  agents,
  isRunning,
  progress
}: TestExecutionDialogProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [executionMode, setExecutionMode] = useState<'all' | 'filtered' | 'random'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState<number>(10);
  const [excludeSQL, setExcludeSQL] = useState(false);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [testCaseCount, setTestCaseCount] = useState(0);

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

    if (open) {
      fetchMetadata();
    }
  }, [open]);

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

    if (open) {
      countTestCases();
    }
  }, [open, executionMode, selectedCategories, selectedDifficulties, excludeSQL]);

  const handleAgentToggle = (agentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAgents(prev => [...prev, agentId]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  const handleExecute = async () => {
    if (selectedAgents.length === 0) return;
    
    const config: TestConfig = {
      models: selectedAgents,
      mode: executionMode,
      categories: executionMode === 'filtered' ? selectedCategories : undefined,
      difficulties: executionMode === 'filtered' ? selectedDifficulties : undefined,
      randomCount: executionMode === 'random' ? randomCount : undefined,
      includeSQL: !excludeSQL,
      excludeSQL
    };
    
    await onExecute(config);
  };

  const getTestCasesToRun = () => {
    if (executionMode === 'random' && randomCount) {
      return Math.min(randomCount, testCaseCount);
    }
    return testCaseCount;
  };

  const getEstimatedTime = () => {
    const casesToTest = getTestCasesToRun();
    const secondsPerTest = 3;
    const totalTime = selectedAgents.length * casesToTest * secondsPerTest;
    return Math.round(totalTime / 60);
  };

  const activeAgents = agents.filter(a => a.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Executar Testes de Qualidade
          </DialogTitle>
        </DialogHeader>

        {isRunning && progress ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Executando Testes...</CardTitle>
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
                {selectedAgents.map(agentId => {
                  const agent = activeAgents.find(a => a.id === agentId);
                  return (
                    <Badge key={agentId} variant="secondary">
                      {agent?.display_name}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Agent Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Selecionar Agentes ({activeAgents.length} disponíveis)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeAgents.map(agent => (
                  <div 
                    key={agent.id} 
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAgents.includes(agent.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleAgentToggle(agent.id, !selectedAgents.includes(agent.id))}
                  >
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={(checked) => handleAgentToggle(agent.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{agent.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.provider} • {agent.model}
                      </p>
                    </div>
                    {agent.is_default && (
                      <Badge variant="outline" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

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
            {executionMode === 'filtered' && (
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
                  min={1}
                  max={testCaseCount}
                />
              </div>
            )}

            <Separator />

            {/* SQL Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Casos SQL</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={!excludeSQL}
                  onCheckedChange={(checked) => setExcludeSQL(!checked)}
                />
                <Label>Incluir casos relacionados a SQL</Label>
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
                  <span>Agentes selecionados:</span>
                  <Badge variant="outline">{selectedAgents.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Casos de teste por agente:</span>
                  <Badge variant="outline">{getTestCasesToRun()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total de execuções:</span>
                  <Badge variant="outline">{selectedAgents.length * getTestCasesToRun()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tempo estimado:</span>
                  <Badge variant="outline">{getEstimatedTime()} min</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Execute Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleExecute} 
                disabled={selectedAgents.length === 0}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Executar Testes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
