import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { unifiedRAGService } from '@/lib/unifiedRAGService';
import { 
  Play, Pause, RefreshCw, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Clock, Zap, Target
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  query: string;
  category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  response?: string;
  expectedKeywords?: string[];
  matchedKeywords?: string[];
  accuracy?: number;
  responseTime?: number;
  error?: string;
}

interface ValidationMetrics {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  accuracy: number;
  avgResponseTime: number;
  categoriesAccuracy: Record<string, number>;
}

export function AgenticRAGValidator() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [metrics, setMetrics] = useState<ValidationMetrics>({
    totalTests: 0,
    completedTests: 0,
    passedTests: 0,
    failedTests: 0,
    accuracy: 0,
    avgResponseTime: 0,
    categoriesAccuracy: {}
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4-turbo-preview');

  // Load test cases from database
  const loadTestCases = async () => {
    try {
      const { data: testCases, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      if (testCases) {
        const results: TestResult[] = testCases.map(tc => ({
          id: tc.id.toString(),
          query: tc.query || tc.question,
          category: tc.category,
          status: 'pending',
          expectedKeywords: tc.expected_keywords || []
        }));

        setTestResults(results);
        setMetrics(prev => ({
          ...prev,
          totalTests: results.length
        }));

        toast.success(`Carregados ${results.length} casos de teste`);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
      toast.error('Erro ao carregar casos de teste');
    }
  };

  // Run validation tests
  const runValidation = async () => {
    if (testResults.length === 0) {
      toast.error('Nenhum caso de teste carregado');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    const startTime = Date.now();

    // Create validation run in database
    const { data: validationRun } = await supabase
      .from('qa_validation_runs')
      .insert({
        model: selectedModel,
        total_tests: testResults.length,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    let completedCount = 0;
    let passedCount = 0;
    let totalResponseTime = 0;
    const categoryStats: Record<string, { total: number; passed: number }> = {};

    for (let i = 0; i < testResults.length; i++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused) {
              clearInterval(checkPause);
              resolve(true);
            }
          }, 100);
        });
      }

      if (!isRunning) break;

      const test = testResults[i];
      
      // Update status to running
      setTestResults(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      try {
        const testStartTime = Date.now();
        
        // Call agentic-rag through unified service
        const result = await unifiedRAGService.testQuery(
          test.query,
          selectedModel
        );
        
        const responseTime = Date.now() - testStartTime;
        totalResponseTime += responseTime;

        // Evaluate response
        const evaluation = evaluateResponse(result.response, test.expectedKeywords || []);
        const passed = evaluation.accuracy >= 0.6; // 60% threshold
        
        if (passed) passedCount++;
        completedCount++;

        // Update category stats
        if (!categoryStats[test.category]) {
          categoryStats[test.category] = { total: 0, passed: 0 };
        }
        categoryStats[test.category].total++;
        if (passed) categoryStats[test.category].passed++;

        // Update test result
        setTestResults(prev => prev.map(t => 
          t.id === test.id ? {
            ...t,
            status: passed ? 'passed' : 'failed',
            response: result.response,
            matchedKeywords: evaluation.matchedKeywords,
            accuracy: evaluation.accuracy,
            responseTime
          } : t
        ));

        // Update metrics
        setMetrics({
          totalTests: testResults.length,
          completedTests: completedCount,
          passedTests: passedCount,
          failedTests: completedCount - passedCount,
          accuracy: (passedCount / completedCount) * 100,
          avgResponseTime: totalResponseTime / completedCount,
          categoriesAccuracy: Object.entries(categoryStats).reduce((acc, [cat, stats]) => {
            acc[cat] = (stats.passed / stats.total) * 100;
            return acc;
          }, {} as Record<string, number>)
        });

        // Save result to database
        if (validationRun) {
          await supabase
            .from('qa_validation_results')
            .insert({
              test_case_id: test.id,
              validation_run_id: validationRun.id,
              model: selectedModel,
              actual_answer: result.response?.substring(0, 2000),
              is_correct: passed,
              accuracy_score: evaluation.accuracy,
              response_time_ms: responseTime
            });
        }

      } catch (error) {
        console.error(`Error testing case ${test.id}:`, error);
        setTestResults(prev => prev.map(t => 
          t.id === test.id ? {
            ...t,
            status: 'error',
            error: error.message
          } : t
        ));
        completedCount++;
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update validation run
    if (validationRun) {
      await supabase
        .from('qa_validation_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          passed_tests: passedCount,
          overall_accuracy: passedCount / completedCount,
          avg_response_time_ms: Math.round(totalResponseTime / completedCount)
        })
        .eq('id', validationRun.id);
    }

    setIsRunning(false);
    const totalTime = Date.now() - startTime;
    
    toast.success(
      `Validação concluída! Precisão: ${metrics.accuracy.toFixed(1)}% em ${(totalTime / 1000).toFixed(1)}s`
    );
  };

  // Evaluate response against expected keywords
  const evaluateResponse = (response: string, expectedKeywords: string[]) => {
    if (!response || expectedKeywords.length === 0) {
      return { accuracy: 0, matchedKeywords: [] };
    }

    const normalizedResponse = response.toLowerCase();
    const matchedKeywords = expectedKeywords.filter(keyword =>
      normalizedResponse.includes(keyword.toLowerCase())
    );

    return {
      accuracy: matchedKeywords.length / expectedKeywords.length,
      matchedKeywords
    };
  };

  // Get filtered results
  const getFilteredResults = () => {
    if (selectedCategory === 'all') return testResults;
    return testResults.filter(r => r.category === selectedCategory);
  };

  // Get unique categories
  const categories = ['all', ...new Set(testResults.map(r => r.category))];

  useEffect(() => {
    loadTestCases();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Validador Agentic-RAG v3</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={loadTestCases}
                disabled={isRunning}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              {!isRunning ? (
                <Button onClick={runValidation} disabled={testResults.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Validação
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={() => setIsRunning(false)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Parar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Modelo LLM</label>
              <select 
                className="w-full mt-1 p-2 border rounded"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isRunning}
              >
                <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <div className="mt-1">
                {isRunning ? (
                  <Badge variant="default" className="animate-pulse">
                    Executando...
                  </Badge>
                ) : metrics.completedTests > 0 ? (
                  <Badge variant={metrics.accuracy >= 95 ? "default" : "secondary"}>
                    {metrics.accuracy >= 95 ? "Meta Atingida!" : "Abaixo da Meta"}
                  </Badge>
                ) : (
                  <Badge variant="outline">Pronto</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Precisão Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.accuracy.toFixed(1)}%
            </div>
            <Progress value={metrics.accuracy} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Meta: 95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Testes Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.passedTests}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {metrics.totalTests} testes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Testes Falhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.failedTests}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.failedTests / metrics.totalTests) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.avgResponseTime / 1000).toFixed(1)}s
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              por consulta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.completedTests}/{metrics.totalTests}
            </div>
            <Progress 
              value={(metrics.completedTests / metrics.totalTests) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      {Object.keys(metrics.categoriesAccuracy).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Precisão por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.categoriesAccuracy).map(([category, accuracy]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{category}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={accuracy} className="w-32" />
                    <Badge variant={accuracy >= 90 ? "default" : "secondary"}>
                      {accuracy.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Resultados dos Testes</CardTitle>
            <div className="flex gap-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {getFilteredResults().map((result) => (
                <div 
                  key={result.id}
                  className="p-3 border rounded-lg flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {result.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      {result.status === 'running' && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                      {result.status === 'error' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      {result.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span className="text-sm font-medium">{result.query}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{result.category}</Badge>
                      {result.accuracy !== undefined && (
                        <span>Precisão: {(result.accuracy * 100).toFixed(0)}%</span>
                      )}
                      {result.responseTime && (
                        <span>Tempo: {(result.responseTime / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    {result.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}