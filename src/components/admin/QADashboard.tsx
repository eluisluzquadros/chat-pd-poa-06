import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Play, BarChart3, FileText, Edit, Settings2, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AddTestCaseDialog } from "./AddTestCaseDialog";
import { EditTestCaseDialog } from "./EditTestCaseDialog";
import { ValidationOptionsDialog, ValidationExecutionOptions } from "./ValidationOptionsDialog";
import { QAErrorAnalysis } from "./QAErrorAnalysis";
import { QAModelComparison } from "./QAModelComparison";
import { GapDetectionDashboard } from "./GapDetectionDashboard";

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

export function QADashboard() {
  const [validationRuns, setValidationRuns] = useState<QAValidationRun[]>([]);
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [selectedResults, setSelectedResults] = useState<QAValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTestCase, setEditingTestCase] = useState<QATestCase | null>(null);
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when validation is running
  useEffect(() => {
    console.log('Progress monitoring useEffect - isRunning:', isRunning, 'currentRunId:', currentRunId);
    let interval: NodeJS.Timeout;
    let minDisplayTimeout: NodeJS.Timeout;
    
    if (isRunning && currentRunId) {
      console.log('Starting progress monitoring interval');
      
      // Ensure progress bar shows for at least 3 seconds
      minDisplayTimeout = setTimeout(() => {
        console.log('Minimum display time reached');
      }, 3000);
      
      interval = setInterval(async () => {
        console.log('Interval tick - checking status');
        const stillRunning = await checkRunStatus(currentRunId);
        if (!stillRunning) {
          console.log('Validation completed, waiting for minimum display time');
          // Wait for minimum display time before hiding
          setTimeout(() => {
            setIsRunning(false);
            setCurrentRunId(null);
            setValidationProgress(null);
            toast.success('Validação QA concluída! Dashboard atualizado.');
          }, 500);
          await fetchData();
        }
      }, 500); // Check every 500ms for smoother updates
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (minDisplayTimeout) clearTimeout(minDisplayTimeout);
    };
  }, [isRunning, currentRunId]);

  const fetchData = async () => {
    try {
      // Fetch validation runs
      const { data: runs } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      // Fetch test cases
      const { data: cases } = await supabase
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
    console.log('checkRunStatus called for runId:', runId);
    
    // Don't check status for temporary IDs
    if (runId.startsWith('temp-')) {
      console.log('Skipping status check for temporary ID');
      return true; // Keep running
    }
    
    try {
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('status, overall_accuracy, passed_tests, total_tests')
        .eq('id', runId)
        .single();
      
      console.log('Run status data:', data);
      
      if (error || !data) {
        console.error('Error checking run status:', error);
        return false;
      }
      
      // Update progress if still running
      if (data.status === 'running' && data.total_tests > 0) {
        // Get completed tests count
        const { count } = await supabase
          .from('qa_validation_results')
          .select('*', { count: 'exact', head: true })
          .eq('validation_run_id', runId);
        
        const completed = count || 0;
        console.log(`Progress update: ${completed}/${data.total_tests} tests completed`);
        
        setValidationProgress({
          current: completed,
          total: data.total_tests,
          percentage: Math.round((completed / data.total_tests) * 100)
        });
      } else if (data.status === 'running') {
        // Still running but no total tests yet
        console.log('Running but no total tests info yet');
        setValidationProgress({
          current: 0,
          total: 0,
          percentage: 0
        });
      }
      
      if (data.status === 'completed' || data.status === 'failed') {
        // Run finished, update local state immediately for better UX
        setValidationRuns(prev => 
          prev.map(run => run.id === runId ? { ...run, ...data } : run)
        );
        return false; // Not running anymore
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

  const executeValidation = async (options: ValidationExecutionOptions, runId?: string, startIdx?: number, modelIndex?: number) => {
    console.log('executeValidation called with options:', options, 'runId:', runId, 'startIdx:', startIdx, 'modelIndex:', modelIndex);
    if (isRunning && !runId) return;
    
    // Get models to test - use agentic-rag as default if no models selected
    const modelsToTest = options.selectedModels || ['agentic-rag'];
    const currentModelIndex = modelIndex || 0;
    
    if (!runId && currentModelIndex === 0) {
      setIsRunning(true);
      console.log('isRunning set to true');
      const totalModels = modelsToTest.length;
      const testsPerModel = options.selectedIds?.length || testCases.length || 38;
      const totalTests = totalModels * testsPerModel;
      
      toast.info(`Iniciando validação QA com ${totalModels} modelo(s)...`);
      
      // Initialize progress immediately with estimated values
      const tempRunId = `temp-${Date.now()}`;
      
      setCurrentRunId(tempRunId);
      setValidationProgress({
        current: 0,
        total: totalTests,
        percentage: 0
      });
      console.log('Initial progress set:', { current: 0, total: totalTests, tempRunId });
    }
    
    // If we've processed all models, finish
    if (currentModelIndex >= modelsToTest.length) {
      setIsRunning(false);
      setCurrentRunId(null);
      setValidationProgress(null);
      toast.success('Validação QA concluída para todos os modelos!');
      await fetchData();
      return;
    }
    
    const currentModel = modelsToTest[currentModelIndex];
    console.log(`Processing model ${currentModelIndex + 1}/${modelsToTest.length}: ${currentModel}`);

    try {
      const body: any = { 
        model: currentModel,
        mode: options.mode || 'all',
        validationRunId: runId || null,
        startIndex: startIdx || 0
      };
      
      if (options.selectedIds?.length) {
        body.testCaseIds = options.selectedIds;
      }
      
      if (options.categories?.length) {
        body.categories = options.categories;
      }
      
      if (options.difficulties?.length) {
        body.difficulties = options.difficulties;
      }
      
      if (options.randomCount) {
        body.randomCount = options.randomCount;
      }
      
      body.includeSQL = options.includeSQL;
      body.excludeSQL = options.excludeSQL;

      console.log('Calling qa-validator with body:', body);
      
      // Add timeout to function call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Function call timeout - aborting');
        controller.abort();
      }, 300000); // 300 second timeout (5 minutes) to allow processing all tests
      
      let response;
      try {
        console.log('Making supabase.functions.invoke call...');
        console.log('Supabase URL:', (supabase as any).supabaseUrl);
        console.log('Function name: qa-validator');
        
        // Use the original qa-validator that calls the main chat edge functions
        const functionName = 'qa-validator';
        console.log('Calling function:', functionName);
        
        response = await supabase.functions.invoke(functionName, {
          body,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('Function call completed');
        console.log('Raw response:', response);
      } catch (invokeError) {
        clearTimeout(timeoutId);
        console.error('Error during invoke:', invokeError);
        if (invokeError.name === 'AbortError') {
          throw new Error('Validação excedeu o tempo limite (30s)');
        }
        throw invokeError;
      }
      
      console.log('qa-validator raw response:', response);
      const { data, error } = response || { data: null, error: null };
      console.log('qa-validator response data:', JSON.stringify(data, null, 2));
      console.log('qa-validator response error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data && data.error) {
        console.error('QA validator error:', data);
        throw new Error(data.error);
      }
      
      // Handle both direct response and nested data
      const responseData = data?.data || data;

      // Set current run ID for tracking
      if (responseData && responseData.validationRunId) {
        console.log('Setting currentRunId:', responseData.validationRunId);
        setCurrentRunId(responseData.validationRunId); // Replace temp ID with real ID
        
        // Initialize or update progress
        const totalTests = responseData.totalTests || options.selectedIds?.length || testCases.length;
        console.log('Progress update:', {
          current: responseData.processedTests,
          total: totalTests,
          percentage: Math.round((responseData.processedTests / totalTests) * 100)
        });
        
        setValidationProgress({
          current: responseData.processedTests || 0,
          total: totalTests,
          percentage: Math.round((responseData.processedTests / totalTests) * 100)
        });
        
        // Check if there are more tests to process for current model
        if (responseData.batchInfo?.hasMoreTests) {
          console.log('More tests to process, continuing with next batch...');
          toast.info(`Lote processado: ${responseData.processedTests}/${totalTests} testes. Continuando...`);
          
          // Continue with next batch after a short delay
          setTimeout(() => {
            executeValidation(options, responseData.validationRunId, responseData.batchInfo.nextStartIndex, currentModelIndex);
          }, 1000);
        } else {
          // All tests completed for current model
          console.log(`All tests completed for model: ${currentModel}`);
          toast.success(`Modelo ${currentModel} concluído! ${responseData.processedTests} testes processados.`);
          
          // Process next model if available
          if (currentModelIndex + 1 < modelsToTest.length) {
            console.log(`Moving to next model: ${modelsToTest[currentModelIndex + 1]}`);
            setTimeout(() => {
              executeValidation(options, null, 0, currentModelIndex + 1);
            }, 2000); // 2 second delay between models
          } else {
            // All models completed
            console.log('All models completed');
            setIsRunning(false);
            setCurrentRunId(null);
            setValidationProgress(null);
            toast.success('Validação QA concluída para todos os modelos!');
            
            // Refresh data
            await fetchData();
          }
        }
      } else {
        console.warn('No validationRunId in response, data structure:', responseData);
        setIsRunning(false);
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack',
        error
      });
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na validação QA';
      toast.error(`Erro na validação QA: ${errorMessage}`);
      setIsRunning(false);
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
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Erro ao carregar resultados");
    }
  };

  const latestRun = validationRuns[0];
  const categories = [...new Set(testCases.map(tc => tc.category))];

  if (loading) {
    return <div className="p-6">Carregando dashboard QA...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Sistema de Validação QA</h2>
          <p className="text-muted-foreground">
            Monitore a acurácia e qualidade das respostas do agente
          </p>
        </div>
        
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
          
          {isRunning && (
            <div className="flex items-center gap-3 bg-muted px-4 py-2 rounded-lg min-w-[300px]">
              {validationProgress && validationProgress.total > 0 ? (
                <>
                  <div className="text-sm font-medium whitespace-nowrap">
                    {validationProgress.current}/{validationProgress.total} testes
                  </div>
                  <Progress value={validationProgress.percentage} className="w-48" />
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {validationProgress.percentage}%
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos de Teste</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testCases.length}</div>
            <p className="text-xs text-muted-foreground">
              {categories.length} categorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Acurácia</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestRun ? `${(latestRun.overall_accuracy * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestRun ? `${latestRun.passed_tests}/${latestRun.total_tests} testes` : 'Nenhuma execução'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestRun ? `${latestRun.avg_response_time_ms}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Por resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {latestRun?.status === 'completed' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : latestRun?.status === 'running' ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestRun?.status || 'Nenhuma'}
            </div>
            <p className="text-xs text-muted-foreground">
              Última execução
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="runs">Execuções</TabsTrigger>
          <TabsTrigger value="cases">Casos de Teste</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="errors">Análise de Erros</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="gaps">Gaps Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4">
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
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
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
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
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
                {testCases.map((testCase) => (
                  <div key={testCase.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{testCase.category}</Badge>
                          <Badge 
                            variant={
                              (testCase.difficulty || testCase.complexity) === 'simple' ? 'secondary' :
                              (testCase.difficulty || testCase.complexity) === 'medium' ? 'default' : 'destructive'
                            }
                          >
                            {testCase.difficulty || testCase.complexity || 'medium'}
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
                        <h4 className="font-medium">{testCase.question || testCase.query}</h4>
                        <p className="text-sm text-muted-foreground">
                          {testCase.expected_answer || testCase.expected_response || 'Sem resposta esperada definida'}
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detalhados</CardTitle>
              <CardDescription>
                Clique em uma execução para ver os resultados detalhados
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
                          <strong>Actual:</strong>
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
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <QAErrorAnalysis />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <QAModelComparison />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <GapDetectionDashboard />
        </TabsContent>
      </Tabs>

      {/* Enhanced Dialogs */}
      <ValidationOptionsDialog
        testCases={testCases}
        open={showValidationOptions}
        onOpenChange={setShowValidationOptions}
        onExecute={executeValidation}
        selectedModel={'agentic-rag'}
      />

      <EditTestCaseDialog
        testCase={editingTestCase}
        open={!!editingTestCase}
        onOpenChange={() => setEditingTestCase(null)}
        onTestCaseUpdated={fetchData}
      />
    </div>
  );
}