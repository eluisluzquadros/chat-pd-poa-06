import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Settings, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QATestCase {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  is_sql_related: boolean;
}

interface ValidationOptionsDialogProps {
  testCases: QATestCase[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (options: ValidationExecutionOptions) => void;
  selectedModel: string;
}

export interface ValidationExecutionOptions {
  mode: 'all' | 'random' | 'selected' | 'category' | 'difficulty' | 'sql_only' | 'filtered';
  selectedIds?: string[];
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

export function ValidationOptionsDialog({ 
  testCases, 
  open, 
  onOpenChange, 
  onExecute, 
  selectedModel 
}: ValidationOptionsDialogProps) {
  const [mode, setMode] = useState<ValidationExecutionOptions['mode']>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState(10);
  const [includeSQL, setIncludeSQL] = useState(true);
  const [excludeSQL, setExcludeSQL] = useState(false);

  const categories = [...new Set(testCases.map(tc => tc.category))];
  const difficulties = [...new Set(testCases.map(tc => tc.difficulty))];
  const sqlCases = testCases.filter(tc => tc.is_sql_related);

  const resetSelections = () => {
    setSelectedIds([]);
    setSelectedCategories([]);
    setSelectedDifficulties([]);
  };

  useEffect(() => {
    resetSelections();
  }, [mode]);

  const handleTestCaseSelection = (testCaseId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, testCaseId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== testCaseId));
    }
  };

  const handleCategorySelection = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  const handleDifficultySelection = (difficulty: string, checked: boolean) => {
    if (checked) {
      setSelectedDifficulties(prev => [...prev, difficulty]);
    } else {
      setSelectedDifficulties(prev => prev.filter(d => d !== difficulty));
    }
  };

  const getFilteredTestCases = () => {
    let filtered = testCases;

    if (excludeSQL) {
      filtered = filtered.filter(tc => !tc.is_sql_related);
    } else if (!includeSQL) {
      filtered = filtered.filter(tc => !tc.is_sql_related);
    }

    switch (mode) {
      case 'selected':
        return filtered.filter(tc => selectedIds.includes(tc.id));
      case 'category':
        return filtered.filter(tc => selectedCategories.includes(tc.category));
      case 'difficulty':
        return filtered.filter(tc => selectedDifficulties.includes(tc.difficulty));
      case 'sql_only':
        return filtered.filter(tc => tc.is_sql_related);
      case 'random':
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, randomCount);
      default:
        return filtered;
    }
  };

  const handleExecute = () => {
    const options: ValidationExecutionOptions = {
      mode,
      includeSQL,
      excludeSQL
    };

    switch (mode) {
      case 'selected':
        if (selectedIds.length === 0) {
          toast.error("Selecione pelo menos um caso de teste");
          return;
        }
        options.selectedIds = selectedIds;
        break;
      case 'category':
        if (selectedCategories.length === 0) {
          toast.error("Selecione pelo menos uma categoria");
          return;
        }
        options.mode = 'filtered';
        options.categories = selectedCategories;
        break;
      case 'difficulty':
        if (selectedDifficulties.length === 0) {
          toast.error("Selecione pelo menos uma dificuldade");
          return;
        }
        options.mode = 'filtered';
        options.difficulties = selectedDifficulties;
        break;
      case 'random':
        options.randomCount = randomCount;
        break;
      case 'sql_only':
        options.mode = 'filtered';
        options.includeSQL = true;
        options.excludeSQL = false;
        break;
    }

    onExecute(options);
    onOpenChange(false);
  };

  const filteredCount = getFilteredTestCases().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Opções de Validação QA
          </DialogTitle>
          <DialogDescription>
            Configure como deseja executar a validação para o modelo <Badge variant="outline">{selectedModel}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Execution Mode */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Modo de Execução</Label>
            <Select value={mode} onValueChange={(value: any) => setMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os casos ativos ({testCases.length})</SelectItem>
                <SelectItem value="random">Seleção aleatória</SelectItem>
                <SelectItem value="selected">Casos específicos</SelectItem>
                <SelectItem value="category">Por categoria</SelectItem>
                <SelectItem value="difficulty">Por dificuldade</SelectItem>
                <SelectItem value="sql_only">Apenas casos SQL ({sqlCases.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SQL Filtering */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Filtros SQL</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_sql"
                  checked={includeSQL}
                  onCheckedChange={(checked) => setIncludeSQL(!!checked)}
                />
                <Label htmlFor="include_sql">Incluir casos SQL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude_sql"
                  checked={excludeSQL}
                  onCheckedChange={(checked) => setExcludeSQL(!!checked)}
                />
                <Label htmlFor="exclude_sql">Excluir casos SQL</Label>
              </div>
            </div>
          </div>

          {/* Random Count */}
          {mode === 'random' && (
            <div className="space-y-2">
              <Label htmlFor="random_count">Quantidade de casos aleatórios</Label>
              <Input
                id="random_count"
                type="number"
                min={1}
                max={testCases.length}
                value={randomCount}
                onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
            </div>
          )}

          {/* Category Selection */}
          {mode === 'category' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Categorias</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category_${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategorySelection(category, !!checked)}
                    />
                    <Label htmlFor={`category_${category}`} className="text-sm">
                      {category} ({testCases.filter(tc => tc.category === category).length})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Selection */}
          {mode === 'difficulty' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Dificuldades</Label>
              <div className="flex gap-4">
                {difficulties.map(difficulty => (
                  <div key={difficulty} className="flex items-center space-x-2">
                    <Checkbox
                      id={`difficulty_${difficulty}`}
                      checked={selectedDifficulties.includes(difficulty)}
                      onCheckedChange={(checked) => handleDifficultySelection(difficulty, !!checked)}
                    />
                    <Label htmlFor={`difficulty_${difficulty}`} className="text-sm">
                      {difficulty} ({testCases.filter(tc => tc.difficulty === difficulty).length})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Test Case Selection */}
          {mode === 'selected' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Casos de Teste</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {testCases.map(testCase => (
                  <div key={testCase.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`testcase_${testCase.id}`}
                      checked={selectedIds.includes(testCase.id)}
                      onCheckedChange={(checked) => handleTestCaseSelection(testCase.id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`testcase_${testCase.id}`} className="text-sm font-normal cursor-pointer">
                        {testCase.question}
                      </Label>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{testCase.category}</Badge>
                        <Badge variant="outline" className="text-xs">{testCase.difficulty}</Badge>
                        {testCase.is_sql_related && (
                          <Badge variant="outline" className="text-xs">SQL</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Casos que serão testados: {filteredCount}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExecute} disabled={filteredCount === 0}>
              <Play className="h-4 w-4 mr-2" />
              Executar Validação ({filteredCount} casos)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}