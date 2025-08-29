import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, TrendingUp, Target, AlertTriangle, 
  CheckCircle, XCircle, Info, Zap, BarChart3,
  RefreshCw, BookOpen, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface CognitiveDistance {
  semanticDistance: number;
  structuralDistance: number;
  keywordCoverage: number;
  conceptualAlignment: number;
  overallDistance: number;
  missingConcepts: string[];
  extraneousConcepts: string[];
  recommendations: string[];
}

interface TestCaseAnalysis {
  testCaseId: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  accuracy: number;
  cognitiveDistance: CognitiveDistance;
  performanceLevel: string;
  primaryIssue: string;
  improvementPotential: number;
}

interface LearningPattern {
  category: string;
  errorType: string;
  frequency: number;
  avgDistance: number;
  commonMissingConcepts: string[];
  suggestedImprovements: string[];
}

export function CognitiveAnalysisPanel() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<TestCaseAnalysis | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<TestCaseAnalysis[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const [evolutionMetrics, setEvolutionMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch recent validation results for analysis
  const fetchRecentResults = async () => {
    try {
      setIsLoading(true);

      // Get recent validation results with test case details
      const { data: results } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (
            id,
            query,
            question,
            expected_answer,
            expected_keywords,
            category
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (results && results.length > 0) {
        // Analyze each result
        const analyses: TestCaseAnalysis[] = [];
        
        for (const result of results) {
          if (result.actual_answer && result.qa_test_cases) {
            const analysis = await analyzeCognitiveDistance(result);
            if (analysis) {
              analyses.push(analysis);
            }
          }
        }
        
        setRecentAnalyses(analyses);
      }

      // Fetch learning patterns
      await fetchLearningPatterns();
      
      // Fetch evolution metrics
      await fetchEvolutionMetrics();

    } catch (error) {
      console.error('Error fetching cognitive analysis data:', error);
      toast.error('Erro ao carregar análises cognitivas');
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze cognitive distance for a single result
  const analyzeCognitiveDistance = async (result: any): Promise<TestCaseAnalysis | null> => {
    try {
      const testCase = result.qa_test_cases;
      
      const { data, error } = await supabase.functions.invoke('rl-cognitive-agent', {
        body: {
          action: 'analyze_cognitive_distance',
          data: {
            testCaseId: result.test_case_id,
            expectedAnswer: testCase.expected_answer || '',
            actualAnswer: result.actual_answer || '',
            expectedKeywords: testCase.expected_keywords || [],
            category: testCase.category || 'general',
            model: result.model,
            accuracy: result.accuracy_score || 0,
            responseTime: result.response_time_ms || 0
          }
        }
      });

      if (error) {
        console.error('Error analyzing cognitive distance:', error);
        return null;
      }

      return {
        testCaseId: result.test_case_id,
        question: testCase.query || testCase.question || '',
        expectedAnswer: testCase.expected_answer || '',
        actualAnswer: result.actual_answer || '',
        accuracy: result.accuracy_score || 0,
        cognitiveDistance: data.analysis,
        performanceLevel: data.insights.performanceLevel,
        primaryIssue: data.insights.primaryIssue,
        improvementPotential: data.insights.improvementPotential
      };
    } catch (error) {
      console.error('Error in cognitive analysis:', error);
      return null;
    }
  };

  // Fetch learning patterns from RL agent
  const fetchLearningPatterns = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('rl-cognitive-agent', {
        body: {
          action: 'learn_from_errors',
          data: {}
        }
      });

      if (!error && data?.patterns) {
        setLearningPatterns(data.patterns);
      }
    } catch (error) {
      console.error('Error fetching learning patterns:', error);
    }
  };

  // Fetch evolution metrics
  const fetchEvolutionMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('rl-cognitive-agent', {
        body: {
          action: 'track_evolution',
          data: {}
        }
      });

      if (!error && data?.evolution) {
        setEvolutionMetrics(data.evolution);
      }
    } catch (error) {
      console.error('Error fetching evolution metrics:', error);
    }
  };

  // Trigger learning process
  const triggerLearning = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('rl-cognitive-agent', {
        body: {
          action: 'generate_improvements',
          data: {}
        }
      });

      if (!error && data?.improvements) {
        toast.success(`${data.improvements.length} melhorias identificadas`);
        await fetchRecentResults();
      }
    } catch (error) {
      console.error('Error triggering learning:', error);
      toast.error('Erro ao gerar melhorias');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchRecentResults();
  }, []);

  const getDistanceColor = (distance: number) => {
    if (distance < 0.2) return 'text-green-500';
    if (distance < 0.4) return 'text-blue-500';
    if (distance < 0.6) return 'text-yellow-500';
    if (distance < 0.8) return 'text-orange-500';
    return 'text-red-500';
  };

  const getPerformanceBadge = (level: string) => {
    const variants: Record<string, any> = {
      'Excelente': 'default',
      'Bom': 'secondary',
      'Regular': 'outline',
      'Fraco': 'destructive',
      'Crítico': 'destructive'
    };
    return <Badge variant={variants[level] || 'outline'}>{level}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise de Distância Cognitiva
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Aprendizagem por reforço e evolução do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchRecentResults}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={triggerLearning}
            disabled={isAnalyzing}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Gerar Melhorias
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {evolutionMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Taxa de Melhoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {evolutionMetrics.improvementRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Desde o início
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tendência de Acurácia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {evolutionMetrics.accuracyTrend === 'improving' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : evolutionMetrics.accuracyTrend === 'declining' ? (
                  <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                ) : (
                  <BarChart3 className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-lg font-semibold capitalize">
                  {evolutionMetrics.accuracyTrend === 'improving' ? 'Melhorando' :
                   evolutionMetrics.accuracyTrend === 'declining' ? 'Declinando' : 'Estável'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Meta de 90%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {evolutionMetrics.predictions?.targetIterationsToGoal || '?'}
              </div>
              <p className="text-xs text-muted-foreground">
                Iterações restantes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Confiança</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={evolutionMetrics.predictions?.confidenceLevel === 'high' ? 'default' : 'secondary'}>
                {evolutionMetrics.predictions?.confidenceLevel === 'high' ? 'Alta' : 'Baixa'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Nível de confiança
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Análise Detalhada</TabsTrigger>
          <TabsTrigger value="patterns">Padrões de Aprendizagem</TabsTrigger>
          <TabsTrigger value="comparison">Comparação Visual</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Test Cases List */}
            <Card>
              <CardHeader>
                <CardTitle>Casos de Teste Analisados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentAnalyses.map((analysis, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAnalysis?.testCaseId === analysis.testCaseId ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-2">
                            {analysis.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getPerformanceBadge(analysis.performanceLevel)}
                            <span className="text-xs text-muted-foreground">
                              Distância: {(analysis.cognitiveDistance.overallDistance * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {analysis.accuracy >= 0.7 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Analysis Details */}
            {selectedAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Distance Metrics */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Métricas de Distância</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Distância Semântica</span>
                          <span className={getDistanceColor(selectedAnalysis.cognitiveDistance.semanticDistance)}>
                            {(selectedAnalysis.cognitiveDistance.semanticDistance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={100 - selectedAnalysis.cognitiveDistance.semanticDistance * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Distância Estrutural</span>
                          <span className={getDistanceColor(selectedAnalysis.cognitiveDistance.structuralDistance)}>
                            {(selectedAnalysis.cognitiveDistance.structuralDistance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={100 - selectedAnalysis.cognitiveDistance.structuralDistance * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Cobertura de Palavras-chave</span>
                          <span className="text-green-500">
                            {(selectedAnalysis.cognitiveDistance.keywordCoverage * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedAnalysis.cognitiveDistance.keywordCoverage * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Alinhamento Conceitual</span>
                          <span className="text-blue-500">
                            {(selectedAnalysis.cognitiveDistance.conceptualAlignment * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedAnalysis.cognitiveDistance.conceptualAlignment * 100} />
                      </div>
                    </div>
                  </div>

                  {/* Missing Concepts */}
                  {selectedAnalysis.cognitiveDistance.missingConcepts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Conceitos Ausentes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAnalysis.cognitiveDistance.missingConcepts.map((concept, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extraneous Concepts */}
                  {selectedAnalysis.cognitiveDistance.extraneousConcepts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Conceitos Irrelevantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAnalysis.cognitiveDistance.extraneousConcepts.map((concept, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {selectedAnalysis.cognitiveDistance.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recomendações</h4>
                      <div className="space-y-1">
                        {selectedAnalysis.cognitiveDistance.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Target className="h-3 w-3 text-primary mt-0.5" />
                            <p className="text-sm text-muted-foreground">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Summary */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Problema Principal:</strong> {selectedAnalysis.primaryIssue}<br />
                      <strong>Potencial de Melhoria:</strong> {selectedAnalysis.improvementPotential}%
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Answer Comparison */}
          {selectedAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Respostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600">Resposta Esperada</h4>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedAnalysis.expectedAnswer || 'Não especificada'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-blue-600">Resposta Recebida</h4>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedAnalysis.actualAnswer || 'Sem resposta'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Padrões de Erro Identificados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningPatterns.map((pattern, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">
                          {pattern.category}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={pattern.errorType === 'Erro Sistêmico' ? 'destructive' : 'secondary'}>
                            {pattern.errorType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {pattern.frequency} ocorrências
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Distância Média</p>
                        <p className={`text-lg font-semibold ${getDistanceColor(pattern.avgDistance)}`}>
                          {(pattern.avgDistance * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {pattern.commonMissingConcepts.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">Conceitos Frequentemente Ausentes:</p>
                        <div className="flex flex-wrap gap-1">
                          {pattern.commonMissingConcepts.slice(0, 5).map((concept, cidx) => (
                            <Badge key={cidx} variant="outline" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {pattern.suggestedImprovements.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Melhorias Sugeridas:</p>
                        <ul className="space-y-1">
                          {pattern.suggestedImprovements.slice(0, 3).map((improvement, iidx) => (
                            <li key={iidx} className="text-sm flex items-start gap-1">
                              <Zap className="h-3 w-3 text-yellow-500 mt-0.5" />
                              <span>{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {learningPatterns.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum padrão de aprendizagem identificado ainda. Execute mais testes para gerar padrões.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Visualização Comparativa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Distance Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Distribuição de Distância Cognitiva</h4>
                  <div className="space-y-2">
                    {recentAnalyses.slice(0, 10).map((analysis, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm w-40 truncate" title={analysis.question}>
                          {analysis.question}
                        </span>
                        <div className="flex-1">
                          <Progress 
                            value={100 - analysis.cognitiveDistance.overallDistance * 100} 
                            className="h-2"
                          />
                        </div>
                        <span className={`text-sm font-medium ${getDistanceColor(analysis.cognitiveDistance.overallDistance)}`}>
                          {(analysis.cognitiveDistance.overallDistance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Levels Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Distribuição de Performance</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {['Excelente', 'Bom', 'Regular', 'Fraco', 'Crítico'].map(level => {
                      const count = recentAnalyses.filter(a => a.performanceLevel === level).length;
                      const percentage = recentAnalyses.length > 0 ? (count / recentAnalyses.length) * 100 : 0;
                      
                      return (
                        <div key={level} className="text-center">
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</div>
                          {getPerformanceBadge(level)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}