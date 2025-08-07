import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Play, BarChart3, FileText, Edit, Settings2, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddTestCaseDialog } from "./AddTestCaseDialog";
import { EditTestCaseDialog } from "./EditTestCaseDialog";
import { ValidationOptionsDialog, ValidationExecutionOptions } from "./ValidationOptionsDialog";

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
  question: string;
  expected_answer: string;
  expected_sql?: string;
  category: string;
  difficulty: string;
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

interface QADashboardWrapperProps {
  tab: 'runs' | 'cases' | 'results';
}

export function QADashboardWrapper({ tab }: QADashboardWrapperProps) {
  const [validationRuns, setValidationRuns] = useState<QAValidationRun[]>([]);
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [selectedResults, setSelectedResults] = useState<QAValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTestCase, setEditingTestCase] = useState<QATestCase | null>(null);
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [lastCompletedProgress, setLastCompletedProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when validation is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let minDisplayTimeout: NodeJS.Timeout;
    
    if (isRunning && currentRunId) {
      minDisplayTimeout = setTimeout(() => {
        console.log('Minimum display time reached');
      }, 3000);
      
      interval = setInterval(async () => {
        const stillRunning = await checkRunStatus(currentRunId);
        if (!stillRunning) {
          setTimeout(() => {
            setIsRunning(false);
            setCurrentRunId(null);
            if (validationProgress) {
              setLastCompletedProgress(validationProgress);
            }
            setValidationProgress(null);
            toast.success('Validação QA concluída! Dashboard atualizado.');
          }, 500);
          await fetchData();
        }
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (minDisplayTimeout) clearTimeout(minDisplayTimeout);
    };
  }, [isRunning, currentRunId]);

  const fetchData = async () => {
    try {
      const { data: runs } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      const { data: cases, error: casesError } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setValidationRuns(runs || []);
      setTestCases(cases || []);
    } catch (error) {
      console.error('Error fetching QA data:', error);
      toast.error("Erro ao carregar dados de QA");
    } finally {
      setLoading(false);
    }
  };

  const checkRunStatus = async (runId: string): Promise<boolean> => {
    if (runId.startsWith('temp-')) {
      return true;
    }
    
    try {
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('status, overall_accuracy, passed_tests, total_tests')
        .eq('id', runId)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      if (data.status === 'running') {
        const { count } = await supabase
          .from('qa_validation_results')
          .select('*', { count: 'exact', head: true })
          .eq('validation_run_id', runId);
        
        const completed = count || 0;
        const totalTests = data.total_tests || validationProgress?.total || testCases.filter(tc => tc.is_active).length || 10;
        
        setValidationProgress({
          current: completed,
          total: totalTests,
          percentage: totalTests > 0 ? Math.round((completed / totalTests) * 100) : 0
        });
      }
      
      if (data.status === 'completed' || data.status === 'failed') {
        setValidationRuns(prev => 
          prev.map(run => run.id === runId ? { ...run, ...data } : run)
        );
        return false;
      }
      
      return data.status === 'running';
    } catch (error) {
      console.error('Error in checkRunStatus:', error);
      return false;
    }
  };

  const runValidation = async () => {
    setShowValidationOptions(true);
  };

  const executeValidation = async (options: ValidationExecutionOptions) => {
    setIsRunning(true);
    const tempRunId = `temp-${Date.now()}`;
    setCurrentRunId(tempRunId);
    
    toast.info("Iniciando validação QA...");
    
    try {
      // Chamar a Edge Function qa-execute-validation
      const { data, error } = await supabase.functions.invoke('qa-execute-validation', {
        body: {
          mode: options.mode,
          selectedIds: options.selectedIds,
          categories: options.categories,
          difficulties: options.difficulties,
          randomCount: options.randomCount,
          model: options.selectedModels?.[0] || 'agentic-rag'
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.runId) {
        setCurrentRunId(data.runId);
        
        // Iniciar progresso
        setValidationProgress({
          current: 0,
          total: data.totalTests || 10,
          percentage: 0
        });
        
        // Simular progresso enquanto a validação ocorre
        const progressInterval = setInterval(() => {
          setValidationProgress(prev => {
            if (!prev) return null;
            const newCurrent = Math.min(prev.current + 1, prev.total);
            return {
              current: newCurrent,
              total: prev.total,
              percentage: Math.round((newCurrent / prev.total) * 100)
            };
          });
        }, 1000);
        
        // Limpar intervalo quando terminar
        setTimeout(() => {
          clearInterval(progressInterval);
          setIsRunning(false);
          setCurrentRunId(null);
          if (validationProgress) {
            setLastCompletedProgress(validationProgress);
          }
          setValidationProgress(null);
          toast.success(`Validação QA concluída! ${data.passedTests}/${data.totalTests} testes passaram.`);
          fetchData(); // Recarregar dados
        }, Math.max(3000, data.totalTests * 500)); // Tempo baseado no número de testes
      }
      
    } catch (error) {
      console.error('Error executing validation:', error);
      setIsRunning(false);
      setCurrentRunId(null);
      setValidationProgress(null);
      toast.error("Erro ao executar validação");
    }
  };

  const fetchRunResults = async (runId: string) => {
    try {
      const { data } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (*)
        `)
        .eq('validation_run_id', runId)
        .order('created_at', { ascending: false });

      setSelectedResults(data || []);
      setSelectedRunId(runId);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Erro ao carregar resultados");
    }
  };

  if (loading) {
    return <div className="p-6">Carregando dados QA...</div>;
  }

  // Render validation controls header
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
        
        {(isRunning || lastCompletedProgress) && (
          <div className="flex items-center gap-3 bg-muted px-4 py-2 rounded-lg min-w-[300px]">
            {validationProgress ? (
              <>
                <div className="text-sm font-medium whitespace-nowrap">
                  {validationProgress.current}/{validationProgress.total || '?'} testes
                </div>
                <Progress 
                  value={validationProgress.total > 0 ? validationProgress.percentage : 0} 
                  className="w-48" 
                />
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {validationProgress.total > 0 ? `${validationProgress.percentage}%` : 'Iniciando...'}
                </div>
              </>
            ) : lastCompletedProgress && !isRunning ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="text-sm font-medium whitespace-nowrap">
                  {lastCompletedProgress.current}/{lastCompletedProgress.total} testes
                </div>
                <Progress 
                  value={lastCompletedProgress.percentage} 
                  className="w-48" 
                />
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {lastCompletedProgress.percentage}% completo
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="text-sm text-muted-foreground">
                  Preparando validação...
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render content based on tab
  switch (tab) {
    case 'runs':
      return (
        <div className="space-y-4">
          {renderValidationHeader()}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Validações</CardTitle>
              <CardDescription>
                Últimas execuções do sistema de validação QA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validationRuns.map((run) => (
                  <div 
                    key={run.id} 
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50",
                      selectedRunId === run.id && "bg-muted border-primary"
                    )}
                    onClick={() => fetchRunResults(run.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{run.model}</Badge>
                        <Badge 
                          variant={run.status === 'completed' ? 'default' : 
                                  run.status === 'running' ? 'secondary' : 'destructive'}
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.started_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-lg font-semibold">
                        {(run.overall_accuracy * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run.passed_tests}/{run.total_tests} testes
                      </div>
                      <Progress 
                        value={run.overall_accuracy * 100} 
                        className="w-24 h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <ValidationOptionsDialog
            testCases={testCases}
            open={showValidationOptions}
            onOpenChange={setShowValidationOptions}
            onExecute={executeValidation}
            selectedModel={'agentic-rag'}
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
                                  testCase.difficulty === 'simple' ? 'secondary' :
                                  testCase.difficulty === 'medium' ? 'default' : 'destructive'
                                }
                              >
                                {testCase.difficulty || 'Sem dificuldade'}
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
                            <h4 className="font-medium">{testCase.question || 'Sem pergunta'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {testCase.expected_answer || 'Sem resposta esperada'}
                            </p>
                            {testCase.expected_sql && (
                              <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                                <strong>SQL esperado:</strong>
                                <pre className="mt-1 text-muted-foreground">{testCase.expected_sql}</pre>
                              </div>
                            )}
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

    case 'results':
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detalhados</CardTitle>
              <CardDescription>
                Clique em uma execução na aba "Execuções" para ver os resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedResults.length > 0 ? (
                <div className="space-y-4">
                  {selectedResults.map((result) => (
                    <div key={result.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.is_correct ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <Badge variant="outline">
                            {(result.accuracy_score * 100).toFixed(1)}%
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {result.response_time_ms}ms
                          </span>
                        </div>
                      </div>
                      
                      <h4 className="font-medium mb-2">
                        {result.qa_test_cases.question}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Esperado:</strong>
                          <p className="text-muted-foreground mt-1">
                            {result.qa_test_cases.expected_answer}
                          </p>
                        </div>
                        
                        <div>
                          <strong>Recebido:</strong>
                          <p className="text-muted-foreground mt-1">
                            {result.actual_answer || 'Nenhuma resposta'}
                          </p>
                        </div>
                        
                        {result.generated_sql && (
                          <div>
                            <strong>SQL Gerado:</strong>
                            <pre className="text-muted-foreground mt-1 bg-muted/50 p-2 rounded text-xs font-mono">
                              {result.generated_sql}
                            </pre>
                            <div className="flex gap-2 mt-1">
                              {result.sql_syntax_valid !== null && (
                                <Badge variant={result.sql_syntax_valid ? "default" : "destructive"} className="text-xs">
                                  {result.sql_syntax_valid ? "Sintaxe válida" : "Sintaxe inválida"}
                                </Badge>
                              )}
                              {result.sql_result_match !== null && (
                                <Badge variant={result.sql_result_match ? "default" : "secondary"} className="text-xs">
                                  {result.sql_result_match ? "Resultado correto" : "Resultado incorreto"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {result.error_details && (
                          <div>
                            <strong>Erro:</strong>
                            <p className="text-red-500 mt-1">
                              {result.error_details}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Selecione uma execução para ver os resultados detalhados
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );

    default:
      return null;
  }
}