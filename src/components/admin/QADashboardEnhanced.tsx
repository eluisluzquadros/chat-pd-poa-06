import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Play, BarChart3, FileText, Edit, Settings2, Database, Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddTestCaseDialog } from "./AddTestCaseDialog";
import { EditTestCaseDialog } from "./EditTestCaseDialog";
import { ValidationOptionsDialog, ValidationExecutionOptions } from "./ValidationOptionsDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  expected_sql?: string;
  category: string;
  difficulty?: string;
  complexity?: string;
  tags: string[];
  is_active: boolean;
  is_sql_related: boolean;
  sql_complexity?: string;
  version: number;
}

interface QAValidationResult {
  id: string;
  test_case_id: string;
  model: string;
  actual_answer: string;
  is_correct: boolean;
  accuracy_score: number;
  response_time_ms: number;
  error_type: string;
  error_details: string;
  sql_executed?: boolean;
  sql_syntax_valid?: boolean;
  sql_result_match?: boolean;
  generated_sql?: string;
  qa_test_cases: QATestCase;
}

interface ExecutionResult {
  runId: string;
  model: string;
  totalTests: number;
  passedTests: number;
  overallAccuracy: number;
  avgResponseTime: number;
  status: string;
  results: Array<{
    testCaseId: string;
    question: string;
    expectedAnswer: string;
    actualAnswer: string;
    success: boolean;
    accuracy: number;
    responseTime: number;
    error?: string;
  }>;
}

interface QADashboardEnhancedProps {
  tab: 'runs' | 'cases' | 'results';
}

export function QADashboardEnhanced({ tab }: QADashboardEnhancedProps) {
  const [validationRuns, setValidationRuns] = useState<QAValidationRun[]>([]);
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [selectedResults, setSelectedResults] = useState<QAValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTestCase, setEditingTestCase] = useState<QATestCase | null>(null);
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>([]);
  const [recentRunIds, setRecentRunIds] = useState<Set<string>>(() => {
    // Load recent run IDs from localStorage
    const stored = localStorage.getItem('qa_recent_run_ids');
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        return new Set(ids);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Save recent run IDs to localStorage whenever they change
  useEffect(() => {
    if (recentRunIds.size > 0) {
      localStorage.setItem('qa_recent_run_ids', JSON.stringify(Array.from(recentRunIds)));
    }
  }, [recentRunIds]);

  const fetchData = async () => {
    try {
      // Use Edge Function to fetch runs and test cases (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('qa-fetch-runs', {
        body: { limit: 20 }
      });
      
      if (error) {
        console.error('Error fetching QA data:', error);
        // Fallback to direct query if Edge Function fails
        const { data: runs } = await supabase
          .from('qa_validation_runs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(20);

        const { data: cases } = await supabase
          .from('qa_test_cases')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        setValidationRuns(runs || []);
        setTestCases(cases || []);
      } else if (data?.success) {
        setValidationRuns(data.runs || []);
        setTestCases(data.testCases || []);
        
        // If we have recent run IDs and no current executions, try to rebuild them
        if (recentRunIds.size > 0 && currentExecutions.length === 0 && data.runs) {
          const recentRuns = data.runs.filter((run: QAValidationRun) => recentRunIds.has(run.id));
          if (recentRuns.length > 0) {
            // Fetch detailed results for recent runs
            fetchRecentRunDetails(recentRuns);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching QA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRunDetails = async (runs: QAValidationRun[]) => {
    try {
      const detailedRuns: ExecutionResult[] = [];
      
      for (const run of runs) {
        const { data, error } = await supabase.functions.invoke('qa-get-run-details', {
          body: { runId: run.id }
        });
        
        if (!error && data?.success && data?.data) {
          detailedRuns.push(data.data);
          // Also fetch and set the results for display
          fetchRunResults(run.id);
        }
      }
      
      if (detailedRuns.length > 0) {
        setCurrentExecutions(detailedRuns);
        // Expand these runs by default
        const runIds = new Set(detailedRuns.map(r => r.runId));
        setExpandedRuns(prev => new Set([...prev, ...runIds]));
      }
    } catch (error) {
      console.error('Error fetching recent run details:', error);
    }
  };

  const runValidation = async () => {
    setShowValidationOptions(true);
  };

  const executeValidation = async (options: ValidationExecutionOptions) => {
    setIsRunning(true);
    setCurrentExecutions([]); // Clear previous executions
    
    toast.info("Iniciando validação QA...");
    
    try {
      // Use the new v2 Edge Function
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
      
      if (error) {
        throw error;
      }
      
      if (data?.success && data?.runs) {
        // Store execution results for display
        setCurrentExecutions(data.runs);
        
        // Store run IDs for persistence across refreshes
        const newRunIds = new Set(data.runs.map((r: ExecutionResult) => r.runId));
        setRecentRunIds(newRunIds);
        
        // Expand all new runs by default
        setExpandedRuns(newRunIds);
        
        const summary = data.summary;
        toast.success(
          `Validação concluída! ${summary.totalPassed}/${summary.totalTestsRun} testes passaram (${(summary.avgAccuracy * 100).toFixed(1)}% de acurácia)`
        );
        
        // Ensure all runs are marked as completed
        const runIdsToUpdate = data.runs.map((r: ExecutionResult) => r.runId);
        await supabase.functions.invoke('qa-ensure-completed-status', {
          body: { runIds: runIdsToUpdate }
        });
        
        // Refresh the runs list after a short delay to ensure data is saved
        setTimeout(() => fetchData(), 1000);
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

  const fetchRunResults = async (runId: string) => {
    try {
      // Use the Edge Function to get run details (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('qa-get-run-details', {
        body: { runId }
      });
      
      if (error) {
        console.error('Error fetching results:', error);
        toast.error("Erro ao carregar resultados");
        return;
      }
      
      if (data?.success && data?.data) {
        const runDetails = data.data;
        
        // Transform results to match the expected format
        const transformedResults = runDetails.results.map((result: any) => ({
          id: `${runId}_${result.testCaseId}`,
          validation_run_id: runId,
          test_case_id: result.testCaseId,
          model: result.model,
          actual_answer: result.actualAnswer,
          is_correct: result.success,
          accuracy_score: result.accuracy,
          response_time_ms: result.responseTime,
          error_details: result.error,
          qa_test_cases: {
            id: result.testCaseId,
            test_id: result.testCaseTestId,
            question: result.question,
            expected_answer: result.expectedAnswer
          }
        }));
        
        setSelectedResults(transformedResults);
        
        // Auto-expand the selected run
        setExpandedRuns(prev => new Set(prev).add(runId));
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Erro ao carregar resultados");
    }
  };

  const toggleRunExpansion = (runId: string) => {
    setExpandedRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
        // Fetch results when expanding
        fetchRunResults(runId);
      }
      return newSet;
    });
  };

  const toggleTestExpansion = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // Render validation header with controls
  const renderValidationHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button 
          onClick={runValidation} 
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
      
      {isRunning && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Validação em andamento...
          </span>
        </div>
      )}
    </div>
  );

  // Render a single execution result
  const renderExecutionResult = (execution: ExecutionResult) => {
    const isExpanded = expandedRuns.has(execution.runId);
    
    return (
      <Card key={execution.runId} className="mb-4">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleRunExpansion(execution.runId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Badge variant="outline">{execution.model}</Badge>
              <Badge 
                variant={execution.status === 'completed' ? 'default' : 'secondary'}
              >
                {execution.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {(execution.overallAccuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {execution.passedTests}/{execution.totalTests} testes
                </div>
              </div>
              <Progress 
                value={execution.overallAccuracy * 100} 
                className="w-32 h-2"
              />
            </div>
          </div>
        </CardHeader>
        
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {execution.results.map((result, idx) => {
                    const testId = `${execution.runId}-${idx}`;
                    const isTestExpanded = expandedTests.has(testId);
                    
                    return (
                      <div key={idx} className="border rounded-lg p-3">
                        <div 
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => toggleTestExpansion(testId)}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            {isTestExpanded ? <ChevronDown className="h-4 w-4 mt-1" /> : <ChevronRight className="h-4 w-4 mt-1" />}
                            {result.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{result.question}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {(result.accuracy * 100).toFixed(1)}%
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {result.responseTime}ms
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Collapsible open={isTestExpanded}>
                          <CollapsibleContent>
                            <div className="mt-3 space-y-2 pl-8">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Resposta Esperada:</p>
                                <p className="text-sm bg-muted/50 p-2 rounded mt-1">
                                  {result.expectedAnswer}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Resposta Recebida:</p>
                                <p className={cn(
                                  "text-sm p-2 rounded mt-1",
                                  result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                                )}>
                                  {result.actualAnswer || 'Sem resposta'}
                                </p>
                              </div>
                              
                              {result.error && (
                                <div>
                                  <p className="text-xs font-semibold text-red-600">Erro:</p>
                                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded mt-1">
                                    {result.error}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (loading) {
    return <div className="p-6">Carregando dados QA...</div>;
  }

  // Render content based on tab
  switch (tab) {
    case 'runs':
      return (
        <div className="space-y-4">
          {renderValidationHeader()}
          
          {/* Current Executions - Show recent runs from database if currentExecutions is empty */}
          {(currentExecutions.length > 0 || recentRunIds.size > 0) && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Execução Recente</CardTitle>
                    <CardDescription>
                      Resultados da validação em andamento ou recém-concluída
                    </CardDescription>
                  </div>
                  {recentRunIds.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecentRunIds(new Set());
                        setCurrentExecutions([]);
                        localStorage.removeItem('qa_recent_run_ids');
                        toast.info("Lista de execuções recentes limpa");
                      }}
                    >
                      Limpar Recentes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentExecutions.length > 0 ? (
                  currentExecutions.map(execution => renderExecutionResult(execution))
                ) : (
                  <div className="space-y-3">
                    {validationRuns
                      .filter(run => recentRunIds.has(run.id))
                      .map((run) => {
                        const isExpanded = expandedRuns.has(run.id);
                        
                        return (
                          <div key={run.id}>
                            <div 
                              className={cn(
                                "flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50",
                                isExpanded && "bg-muted border-primary"
                              )}
                              onClick={() => toggleRunExpansion(run.id)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{run.model}</Badge>
                                    <Badge 
                                      variant={run.status === 'completed' ? 'default' : 
                                              run.status === 'running' ? 'secondary' : 'destructive'}
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
                            
                            {/* Inline Results */}
                            <Collapsible open={isExpanded}>
                              <CollapsibleContent>
                                <div className="mt-2 pl-4">
                                  {selectedResults && selectedResults
                                    .filter(r => r && r.validation_run_id === run.id)
                                    .length > 0 ? (
                                    <Card>
                                      <CardContent className="pt-4">
                                        <ScrollArea className="h-[300px]">
                                          <div className="space-y-2">
                                            {selectedResults
                                              .filter(r => r && r.validation_run_id === run.id)
                                              .map((result) => (
                                                <div key={result.id} className="p-3 border rounded-lg">
                                                  <div className="flex items-start gap-2">
                                                    {result.is_correct ? (
                                                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                                    ) : (
                                                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                                    )}
                                                    <div className="flex-1">
                                                      <p className="text-sm font-medium">
                                                        {result.qa_test_cases?.question || 'Sem pergunta'}
                                                      </p>
                                                      <div className="flex gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs">
                                                          {(result.accuracy_score * 100).toFixed(1)}%
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                          {result.response_time_ms}ms
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        </ScrollArea>
                                      </CardContent>
                                    </Card>
                                  ) : (
                                    <p className="text-sm text-muted-foreground p-4">
                                      Carregando resultados...
                                    </p>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Historical Runs */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Validações</CardTitle>
              <CardDescription>
                Clique em uma execução para ver os resultados detalhados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validationRuns.map((run) => {
                  const isExpanded = expandedRuns.has(run.id);
                  
                  return (
                    <div key={run.id}>
                      <div 
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50",
                          isExpanded && "bg-muted border-primary"
                        )}
                        onClick={() => toggleRunExpansion(run.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{run.model}</Badge>
                              <Badge 
                                variant={run.status === 'completed' ? 'default' : 
                                        run.status === 'running' ? 'secondary' : 'destructive'}
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
                      
                      {/* Inline Results */}
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="mt-2 pl-4">
                            {selectedResults && selectedResults
                              .filter(r => r && r.validation_run_id === run.id)
                              .length > 0 ? (
                              <Card>
                                <CardContent className="pt-4">
                                  <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                      {selectedResults
                                        .filter(r => r && r.validation_run_id === run.id)
                                        .map((result) => (
                                          <div key={result.id} className="p-3 border rounded-lg">
                                            <div className="flex items-start gap-2">
                                              {result.is_correct ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                              ) : (
                                                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                              )}
                                              <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                  {result.qa_test_cases.question}
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                  <Badge variant="outline" className="text-xs">
                                                    {(result.accuracy_score * 100).toFixed(1)}%
                                                  </Badge>
                                                  <Badge variant="outline" className="text-xs">
                                                    {result.response_time_ms}ms
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </ScrollArea>
                                </CardContent>
                              </Card>
                            ) : (
                              <p className="text-sm text-muted-foreground p-4">
                                Carregando resultados...
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
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

    case 'cases':
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Casos de Teste Ativos</CardTitle>
                  <CardDescription>
                    Questões e respostas esperadas para validação
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
                            <Badge 
                              variant={
                                (testCase.difficulty || testCase.complexity) === 'simple' ? 'secondary' :
                                (testCase.difficulty || testCase.complexity) === 'medium' ? 'default' : 'destructive'
                              }
                            >
                              {testCase.difficulty || testCase.complexity || 'Sem dificuldade'}
                            </Badge>
                            {testCase.is_sql_related && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                <Database className="h-3 w-3 mr-1" />
                                SQL
                              </Badge>
                            )}
                            {testCase.version && (
                              <Badge variant="outline" className="text-xs">
                                v{testCase.version}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{testCase.question || testCase.query || 'Sem pergunta'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {testCase.expected_answer || 'Sem resposta esperada'}
                          </p>
                          {testCase.tags && testCase.tags.length > 0 && (
                            <div className="flex gap-1">
                              {testCase.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTestCase(testCase)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
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

    default:
      return null;
  }
}