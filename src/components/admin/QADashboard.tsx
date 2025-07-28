import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Play, BarChart3, FileText, Edit, Settings2, Database } from "lucide-react";
import { toast } from "sonner";
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

export function QADashboard() {
  const [validationRuns, setValidationRuns] = useState<QAValidationRun[]>([]);
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [selectedResults, setSelectedResults] = useState<QAValidationResult[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("agentic-rag");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTestCase, setEditingTestCase] = useState<QATestCase | null>(null);
  const [showValidationOptions, setShowValidationOptions] = useState(false);

  const models = [
    "agentic-rag", "claude-chat", "gemini-chat", 
    "llama-chat", "deepseek-chat", "groq-chat"
  ];

  useEffect(() => {
    fetchData();
  }, []);

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

  const runValidation = async () => {
    setShowValidationOptions(true);
  };

  const executeValidation = async (options: ValidationExecutionOptions) => {
    if (isRunning) return;
    
    setIsRunning(true);
    toast.info("Iniciando validação QA personalizada...");

    try {
      const body: any = { model: selectedModel };
      
      // Add options to the request body
      if (options.mode !== 'all') {
        body.mode = options.mode;
      }
      
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

      const { data, error } = await supabase.functions.invoke('qa-validator', {
        body
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.error) {
        console.error('QA validator error:', data);
        throw new Error(data.error);
      }

      toast.success(`Validação concluída: ${data.passedTests}/${data.totalTests} testes passaram`);
      await fetchData();
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na validação QA';
      toast.error(`Erro na validação QA: ${errorMessage}`);
    } finally {
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
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={runValidation} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Executando..." : "Executar Validação"}
          </Button>
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
        <TabsList>
          <TabsTrigger value="runs">Execuções</TabsTrigger>
          <TabsTrigger value="cases">Casos de Teste</TabsTrigger>
          <TabsTrigger value="results">Resultados Detalhados</TabsTrigger>
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
                              testCase.difficulty === 'easy' ? 'secondary' :
                              testCase.difficulty === 'medium' ? 'default' : 'destructive'
                            }
                          >
                            {testCase.difficulty}
                          </Badge>
                          {testCase.is_sql_related && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              <Database className="h-3 w-3 mr-1" />
                              SQL
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            v{testCase.version}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{testCase.question}</h4>
                        <p className="text-sm text-muted-foreground">
                          {testCase.expected_answer}
                        </p>
                        {testCase.expected_sql && (
                          <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                            <strong>SQL esperado:</strong>
                            <pre className="mt-1 text-muted-foreground">{testCase.expected_sql}</pre>
                          </div>
                        )}
                        <div className="flex gap-1">
                          {testCase.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
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
      </Tabs>

      {/* Enhanced Dialogs */}
      <ValidationOptionsDialog
        testCases={testCases}
        open={showValidationOptions}
        onOpenChange={setShowValidationOptions}
        onExecute={executeValidation}
        selectedModel={selectedModel}
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