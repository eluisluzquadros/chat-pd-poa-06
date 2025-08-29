import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Settings, Filter, Cpu } from 'lucide-react';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { supabase } from '@/integrations/supabase/client';

interface QAValidationConfig {
  models: string[]; // Array of model strings for backend compatibility
  executionMode: 'all' | 'random' | 'specific' | 'category' | 'difficulty';
  randomCount?: number;
  specificCaseIds?: string[];
  categories?: string[];
  difficulties?: string[];
  includeSQL: boolean;
  excludeSQL: boolean;
}

interface QAValidationConfigPanelProps {
  onExecute: (config: QAValidationConfig) => void;
  isRunning: boolean;
}

const CATEGORIES = [
  'habitacao',
  'infraestrutura', 
  'meio-ambiente',
  'mobilidade',
  'participacao-social',
  'uso-solo',
  'zoneamento'
];

const DIFFICULTIES = ['easy', 'medium'];

export function QAValidationConfigPanel({ onExecute, isRunning }: QAValidationConfigPanelProps) {
  const [config, setConfig] = useState<QAValidationConfig>({
    models: ['anthropic/claude-3-5-sonnet-20241022'], // Array with single model
    executionMode: 'random',
    randomCount: 10,
    categories: [],
    difficulties: [],
    includeSQL: false,
    excludeSQL: false
  });

  const [availableTestCases, setAvailableTestCases] = useState<any[]>([]);
  const [testCasesCount, setTestCasesCount] = useState(0);

  // Fetch test cases count based on current filters
  const fetchTestCasesCount = async () => {
    try {
      let query = supabase
        .from('qa_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (config.categories.length > 0) {
        query = query.in('category', config.categories);
      }

      if (config.difficulties.length > 0) {
        query = query.in('difficulty', config.difficulties);
      }

      if (config.includeSQL && !config.excludeSQL) {
        query = query.eq('is_sql_related', true);
      } else if (config.excludeSQL && !config.includeSQL) {
        query = query.eq('is_sql_related', false);
      }

      const { count } = await query;
      setTestCasesCount(count || 0);
    } catch (error) {
      console.error('Error fetching test cases count:', error);
    }
  };

  // Fetch available test cases for specific selection
  const fetchAvailableTestCases = async () => {
    if (config.executionMode !== 'specific') return;

    try {
      let query = supabase
        .from('qa_test_cases')
        .select('id, question, category, difficulty')
        .eq('is_active', true)
        .order('category')
        .limit(50);

      const { data } = await query;
      setAvailableTestCases(data || []);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  };

  useEffect(() => {
    fetchTestCasesCount();
  }, [config.categories, config.difficulties, config.includeSQL, config.excludeSQL]);

  useEffect(() => {
    fetchAvailableTestCases();
  }, [config.executionMode]);

  const handleExecute = () => {
    // Validate configuration
    if (!config.models || config.models.length === 0) {
      return;
    }

    if (config.executionMode === 'random' && (!config.randomCount || config.randomCount <= 0)) {
      return;
    }

    if (config.executionMode === 'specific' && (!config.specificCaseIds || config.specificCaseIds.length === 0)) {
      return;
    }

    if (config.executionMode === 'category' && config.categories.length === 0) {
      return;
    }

    if (config.executionMode === 'difficulty' && config.difficulties.length === 0) {
      return;
    }

    onExecute(config);
  };

  const getExecutionSummary = () => {
    switch (config.executionMode) {
      case 'all':
        return `Todos os ${testCasesCount} casos ativos`;
      case 'random':
        return `${config.randomCount} casos aleatórios`;
      case 'specific':
        return `${config.specificCaseIds?.length || 0} casos específicos`;
      case 'category':
        return `${testCasesCount} casos das categorias: ${config.categories.join(', ')}`;
      case 'difficulty':
        return `${testCasesCount} casos de dificuldade: ${config.difficulties.join(', ')}`;
      default:
        return '';
    }
  };

  const groupedModels = UPDATED_MODEL_CONFIGS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof UPDATED_MODEL_CONFIGS>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração de Validação QA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Modelos LLM
          </Label>
          <div className="space-y-4">
            <RadioGroup
              value={config.models[0] || ''}
              onValueChange={(value) => setConfig(prev => ({ ...prev, models: [value] }))}
              className="space-y-3"
            >
              {Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider} className="space-y-2">
                  <Label className="text-sm font-medium capitalize text-muted-foreground">
                    {provider}
                  </Label>
                  <div className="pl-4 space-y-2">
                    {models.map(model => (
                      <div key={model.model} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={model.model} 
                          id={model.model}
                        />
                        <Label htmlFor={model.model} className="text-sm cursor-pointer">
                          {model.displayName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </RadioGroup>
            
            {config.models.length > 0 && (
              <div className="mt-3">
                <Badge variant="secondary">
                  {UPDATED_MODEL_CONFIGS.find(m => m.model === config.models[0])?.displayName || config.models[0]}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Execution Mode */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Modo de Execução
          </Label>
          <Select
            value={config.executionMode}
            onValueChange={(value: any) => setConfig(prev => ({ ...prev, executionMode: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os casos ativos</SelectItem>
              <SelectItem value="random">Amostra aleatória</SelectItem>
              <SelectItem value="specific">Casos específicos</SelectItem>
              <SelectItem value="category">Por categoria</SelectItem>
              <SelectItem value="difficulty">Por dificuldade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode-specific options */}
        {config.executionMode === 'random' && (
          <div className="space-y-2">
            <Label htmlFor="randomCount">Número de casos</Label>
            <Input
              id="randomCount"
              type="number"
              min="1"
              max="100"
              value={config.randomCount || ''}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                randomCount: parseInt(e.target.value) || 0 
              }))}
              placeholder="Ex: 10"
            />
          </div>
        )}

        {config.executionMode === 'category' && (
          <div className="space-y-2">
            <Label>Categorias</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={config.categories.includes(category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          categories: [...prev.categories, category]
                        }));
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          categories: prev.categories.filter(c => c !== category)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={category} className="text-sm capitalize">
                    {category.replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {config.executionMode === 'difficulty' && (
          <div className="space-y-2">
            <Label>Dificuldades</Label>
            <div className="flex gap-4">
              {DIFFICULTIES.map(difficulty => (
                <div key={difficulty} className="flex items-center space-x-2">
                  <Checkbox
                    id={difficulty}
                    checked={config.difficulties.includes(difficulty)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          difficulties: [...prev.difficulties, difficulty]
                        }));
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          difficulties: prev.difficulties.filter(d => d !== difficulty)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={difficulty} className="text-sm capitalize">
                    {difficulty}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {config.executionMode === 'specific' && (
          <div className="space-y-2">
            <Label>Casos de Teste Específicos</Label>
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-2">
              {availableTestCases.map(testCase => (
                <div key={testCase.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`case-${testCase.id}`}
                    checked={config.specificCaseIds?.includes(testCase.id.toString()) || false}
                    onCheckedChange={(checked) => {
                      const caseId = testCase.id.toString();
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          specificCaseIds: [...(prev.specificCaseIds || []), caseId]
                        }));
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          specificCaseIds: (prev.specificCaseIds || []).filter(id => id !== caseId)
                        }));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`case-${testCase.id}`} className="text-sm">
                      {testCase.question?.substring(0, 60)}...
                    </Label>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {testCase.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {testCase.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* SQL Options */}
        <div className="space-y-3">
          <Label>Filtros SQL</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSQL"
                checked={config.includeSQL}
                onCheckedChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  includeSQL: checked as boolean 
                }))}
              />
              <Label htmlFor="includeSQL" className="text-sm">
                Apenas casos SQL
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeSQL"
                checked={config.excludeSQL}
                onCheckedChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  excludeSQL: checked as boolean 
                }))}
              />
              <Label htmlFor="excludeSQL" className="text-sm">
                Excluir casos SQL
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Execution Summary */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Resumo da Execução</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Modelo:</strong> {UPDATED_MODEL_CONFIGS.find(m => m.model === config.models[0])?.displayName || config.models[0]}</p>
            <p><strong>Casos:</strong> {getExecutionSummary()}</p>
            <p><strong>Total estimado:</strong> {testCasesCount} testes</p>
          </div>
        </div>

        {/* Execute Button */}
        <Button 
          onClick={handleExecute}
          disabled={isRunning || config.models.length === 0}
          className="w-full"
          size="lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Executando Validação...' : 'Executar Validação QA'}
        </Button>
      </CardContent>
    </Card>
  );
}