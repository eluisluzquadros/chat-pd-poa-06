import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Loader2, ChevronDown, ChevronRight, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddTestCaseDialog } from "./AddTestCaseDialog";
import { EditTestCaseDialog } from "./EditTestCaseDialog";
import { ValidationOptionsDialog, ValidationExecutionOptions } from "./ValidationOptionsDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QAValidationRun {
  id: string;
  model: string;
  total_tests: number;
  passed_tests: number;
  overall_accuracy: number;
  avg_response_time_ms: number;
  status: string;
  started_at: string;
  completed_at: string;
}

interface QATestCase {
  id: string;
  test_id?: string;
  question: string;
  query?: string;
  expected_answer: string;
  category: string;
  difficulty?: string;
  complexity?: string;
  tags: string[];
  is_active: boolean;
  version: number;
}

interface QAValidationResult {
  id: string;
  validation_run_id: string;
  test_case_id: string;
  model: string;
  actual_answer: string;
  is_correct: boolean;
  accuracy_score: number;
  response_time_ms: number;
  error_details?: string;
}

interface QADashboardSimplifiedProps {
  tab: 'runs' | 'cases';
}

export function QADashboardSimplified({ tab }: QADashboardSimplifiedProps) {
  const [validationRuns, setValidationRuns] = useState<QAValidationRun[]>([]);
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [runResults, setRunResults] = useState<Map<string, QAValidationResult[]>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTestCase, setEditingTestCase] = useState<QATestCase | null>(null);
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch validation runs directly (RLS disabled)
      const { data: runs, error: runsError } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (runsError) {
        console.error('Error fetching runs:', runsError);
        toast.error("Erro ao carregar execuções");
      } else {
        setValidationRuns(runs || []);
      }

      // Fetch test cases
      const { data: cases, error: casesError } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (casesError) {
        console.error('Error fetching cases:', casesError);
        toast.error("Erro ao carregar casos de teste");
      } else {
        setTestCases(cases || []);
      }

      // Fetch results for all runs
      if (runs && runs.length > 0) {
        const runIds = runs.map(r => r.id);
        const { data: results, error: resultsError } = await supabase
          .from('qa_validation_results')
          .select('*')
          .in('validation_run_id', runIds)
          .order('created_at', { ascending: false });

        if (!resultsError && results) {
          // Group results by run ID
          const resultsMap = new Map<string, QAValidationResult[]>();
          results.forEach(result => {
            const runId = result.validation_run_id;
            if (!resultsMap.has(runId)) {
              resultsMap.set(runId, []);
            }
            resultsMap.get(runId)!.push(result);
          });
          setRunResults(resultsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeValidation = async (options: ValidationExecutionOptions) => {
    setIsRunning(true);
    toast.info("Iniciando validação QA...");
    
    try {
      const { data, error } = await supabase.functions.invoke('qa-execute-validation-v2', {
        body: {
          mode: options.mode,
          selectedIds: options.selectedIds,
          categories: options.categories,
          difficulties: options.difficulties,
          randomCount: options.randomCount,
          models: options.selectedModels || ['openai/gpt-3.5-turbo'],
          includeSQL: options.includeSQL,
          excludeSQL: options.excludeSQL
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const summary = data.summary;
        toast.success(
          `Validação concluída! ${summary.totalPassed}/${summary.totalTestsRun} testes passaram (${(summary.avgAccuracy * 100).toFixed(1)}% de acurácia)`
        );
        
        // Refresh data after 2 seconds
        setTimeout(fetchData, 2000);
      } else {
        throw new Error(data?.error || 'Erro desconhecido na validação');
      }
    } catch (error) {
      console.error('Error executing validation:', error);
      toast.error("Erro ao executar validação");
    } finally {
      setIsRunning(false);
    }
  };

  const toggleRunExpansion = (runId: string) => {
    setExpandedRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="p-6">Carregando dados QA...</div>;
  }

  // Render Runs Tab
  if (tab === 'runs') {
    return (
      <div className="space-y-4">
        {/* Header with controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowValidationOptions(true)} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? "Executando..." : "Executar Validação"}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Validation Runs List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Validações</CardTitle>
            <CardDescription>
              {validationRuns.length} execuções encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationRuns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma validação executada ainda
                </p>
              ) : (
                validationRuns.map((run) => {
                  const isExpanded = expandedRuns.has(run.id);
                  const results = runResults.get(run.id) || [];
                  
                  return (
                    <div key={run.id} className="border rounded-lg">
                      <div 
                        className={cn(
                          "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50",
                          isExpanded && "bg-muted"
                        )}
                        onClick={() => toggleRunExpansion(run.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{run.model}</Badge>
                              <Badge 
                                variant={run.status === 'completed' ? 'default' : 'secondary'}
                              >
                                {run.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(run.started_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {(run.overall_accuracy * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {run.passed_tests}/{run.total_tests} testes
                            </div>
                          </div>
                          <Progress 
                            value={run.overall_accuracy * 100} 
                            className="w-24 h-2"
                          />
                        </div>
                      </div>
                      
                      {/* Expanded Results */}
                      {isExpanded && (
                        <div className="border-t p-4">
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                              {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Nenhum resultado encontrado para esta execução
                                </p>
                              ) : (
                                results.map((result) => (
                                  <div key={result.id} className="p-3 border rounded-lg">
                                    <div className="flex items-start gap-2">
                                      {result.is_correct ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                      )}
                                      <div className="flex-1">
                                        <p className="text-sm">
                                          Teste #{result.test_case_id.substring(0, 8)}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs">
                                            {(result.accuracy_score * 100).toFixed(1)}%
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {result.response_time_ms}ms
                                          </Badge>
                                        </div>
                                        {result.error_details && (
                                          <p className="text-xs text-red-600 mt-1">
                                            {result.error_details}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        
        <ValidationOptionsDialog
          testCases={testCases}
          open={showValidationOptions}
          onOpenChange={setShowValidationOptions}
          onExecute={executeValidation}
          selectedModel={'openai/gpt-3.5-turbo'}
        />
      </div>
    );
  }

  // Render Cases Tab
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Casos de Teste Ativos</CardTitle>
              <CardDescription>
                {testCases.length} casos de teste encontrados
              </CardDescription>
            </div>
            <AddTestCaseDialog onTestCaseAdded={fetchData} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testCases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum caso de teste encontrado
              </p>
            ) : (
              testCases.map((testCase) => (
                <div key={testCase.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{testCase.category || 'Sem categoria'}</Badge>
                        <Badge variant="outline">
                          {testCase.difficulty || testCase.complexity || 'Sem dificuldade'}
                        </Badge>
                        {testCase.version && (
                          <Badge variant="outline" className="text-xs">
                            v{testCase.version}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{testCase.question || testCase.query}</h4>
                      <p className="text-sm text-muted-foreground">
                        {testCase.expected_answer}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTestCase(testCase)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <EditTestCaseDialog
        testCase={editingTestCase}
        open={!!editingTestCase}
        onOpenChange={() => setEditingTestCase(null)}
        onTestCaseUpdated={fetchData}
      />
    </div>
  );
}