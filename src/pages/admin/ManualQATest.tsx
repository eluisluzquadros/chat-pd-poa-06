import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { QATestCase } from "@/types/qa";

interface ManualResult {
  testCase: QATestCase;
  actualAnswer: string;
  isCorrect: boolean | null;
  notes: string;
  responseTime: number;
  tested: boolean;
}

export default function ManualQATest() {
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<ManualResult[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadTestCases();
  }, []);

  const loadTestCases = async () => {
    try {
      const { data, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      const formattedData: QATestCase[] = data.map(item => ({
        id: item.id,
        test_id: item.test_id,
        question: item.question || item.query,
        query: item.query,
        expected_answer: item.expected_answer || '',
        expected_response: item.expected_answer,
        expected_sql: item.expected_sql,
        category: item.category,
        difficulty: item.difficulty,
        complexity: item.complexity,
        tags: item.tags || [],
        is_active: item.is_active,
        is_sql_related: item.is_sql_related,
        version: item.version,
        created_at: item.created_at,
        updated_at: item.updated_at,
        expected_keywords: item.expected_keywords || [],
        min_response_length: item.min_response_length,
        sql_complexity: item.sql_complexity
      }));

      setTestCases(formattedData);
      setResults(formattedData.map(tc => ({
        testCase: tc,
        actualAnswer: '',
        isCorrect: null,
        notes: '',
        responseTime: 0,
        tested: false
      })));
    } catch (error) {
      console.error('Error loading test cases:', error);
      toast.error('Erro ao carregar casos de teste');
    } finally {
      setLoading(false);
    }
  };

  const executeTest = async () => {
    if (currentTestIndex >= testCases.length) return;

    setTesting(true);
    const startTime = Date.now();
    const currentCase = testCases[currentTestIndex];

    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: { 
          message: currentCase.question || currentCase.query,
          sessionId: 'manual-qa-test',
          userRole: 'admin',
          model: 'gpt-4o-mini'
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) throw error;

      const newResult: ManualResult = {
        testCase: currentCase,
        actualAnswer: data?.response || 'Erro na resposta',
        isCorrect: null,
        notes: '',
        responseTime,
        tested: true
      };

      setResults(prev => {
        const updated = [...prev];
        updated[currentTestIndex] = newResult;
        return updated;
      });

      toast.success(`Teste executado em ${responseTime}ms`);
    } catch (error) {
      console.error('Error executing test:', error);
      toast.error('Erro ao executar teste');
      
      setResults(prev => {
        const updated = [...prev];
        updated[currentTestIndex] = {
          testCase: currentCase,
          actualAnswer: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          isCorrect: null,
          notes: '',
          responseTime: Date.now() - startTime,
          tested: true
        };
        return updated;
      });
    } finally {
      setTesting(false);
    }
  };

  const markResult = async (isCorrect: boolean) => {
    if (currentTestIndex >= results.length) return;

    const result = results[currentTestIndex];
    if (!result.tested) {
      toast.error('Execute o teste primeiro');
      return;
    }

    try {
      const { error } = await supabase
        .from('manual_qa_results')
        .insert({
          test_case_id: Number(result.testCase.id),
          question: result.testCase.question || result.testCase.query || '',
          expected_answer: result.testCase.expected_answer,
          actual_answer: result.actualAnswer,
          is_correct: isCorrect,
          notes: notes,
          category: result.testCase.category,
          response_time_ms: result.responseTime
        });

      if (error) throw error;

      setResults(prev => {
        const updated = [...prev];
        updated[currentTestIndex] = {
          ...updated[currentTestIndex],
          isCorrect,
          notes
        };
        return updated;
      });

      toast.success(`Resultado salvo: ${isCorrect ? 'Correto' : 'Incorreto'}`);
      
      // Move to next test
      if (currentTestIndex < testCases.length - 1) {
        setCurrentTestIndex(prev => prev + 1);
        setNotes('');
      }
    } catch (error) {
      console.error('Error saving result:', error);
      toast.error('Erro ao salvar resultado');
    }
  };

  const filteredCases = testCases.filter(tc => 
    selectedCategory === 'all' || tc.category === selectedCategory
  );

  const categories = Array.from(new Set(testCases.map(tc => tc.category)));
  const testedCount = results.filter(r => r.tested).length;
  const correctCount = results.filter(r => r.isCorrect === true).length;
  const incorrectCount = results.filter(r => r.isCorrect === false).length;
  const accuracy = testedCount > 0 ? (correctCount / testedCount) * 100 : 0;

  const currentCase = filteredCases[currentTestIndex];
  const currentResult = results[currentTestIndex];

  if (loading) {
    return <div className="p-6">Carregando casos de teste...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sistema QA Manual Temporário</h1>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{testCases.length}</div>
            <div className="text-sm text-muted-foreground">Total de Casos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{testedCount}</div>
            <div className="text-sm text-muted-foreground">Testados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{correctCount}</div>
            <div className="text-sm text-muted-foreground">Corretos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
            <div className="text-sm text-muted-foreground">Incorretos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{accuracy.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Precisão</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progresso: {currentTestIndex + 1} de {filteredCases.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((currentTestIndex + 1) / filteredCases.length) * 100)}%
            </span>
          </div>
          <Progress value={((currentTestIndex + 1) / filteredCases.length) * 100} />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Categoria:</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 ml-auto">
              <Button
                onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
                disabled={currentTestIndex === 0}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentTestIndex(Math.min(filteredCases.length - 1, currentTestIndex + 1))}
                disabled={currentTestIndex >= filteredCases.length - 1}
                variant="outline"
                size="sm"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentCase && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Case */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Caso de Teste #{currentCase.id}
                <Badge variant="outline">{currentCase.category}</Badge>
                {currentCase.difficulty && (
                  <Badge variant="secondary">{currentCase.difficulty}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Pergunta:</label>
                <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                  {currentCase.question || currentCase.query}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resposta Esperada:</label>
                <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                  {currentCase.expected_answer}
                </p>
              </div>

              {currentCase.tags && currentCase.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags:</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentCase.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={executeTest} 
                disabled={testing}
                className="w-full"
                size="lg"
              >
                {testing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Executar Teste
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Resultado
                {currentResult?.tested && (
                  <Badge variant={currentResult.isCorrect === true ? "default" : currentResult.isCorrect === false ? "destructive" : "secondary"}>
                    {currentResult.isCorrect === true ? "Correto" : currentResult.isCorrect === false ? "Incorreto" : "Aguardando"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentResult?.tested ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Resposta do Sistema ({currentResult.responseTime}ms):
                    </label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                      {currentResult.actualAnswer}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notas (opcional):</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adicione observações sobre o teste..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {currentResult.isCorrect === null && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => markResult(true)}
                        className="flex-1"
                        variant="default"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Correto
                      </Button>
                      <Button 
                        onClick={() => markResult(false)}
                        className="flex-1"
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Incorreto
                      </Button>
                    </div>
                  )}

                  {currentResult.isCorrect !== null && (
                    <div className="text-center p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">
                        Resultado salvo como: {currentResult.isCorrect ? "Correto" : "Incorreto"}
                      </p>
                      {currentResult.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Notas: {currentResult.notes}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Execute o teste para ver o resultado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}