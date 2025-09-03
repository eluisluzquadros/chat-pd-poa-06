import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BarChart3,
  Zap,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface CognitiveMetrics {
  semanticSimilarity: number;
  conceptualAlignment: number;
  responseCompleteness: number;
  cognitiveDistance: number;
  keywordCoverage: number;
  contextRelevance: number;
}

interface CognitiveAnalysis {
  id: string;
  testCaseId: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  accuracyScore: number;
  metrics: CognitiveMetrics;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    missingConcepts: string[];
    irrelevantContent: string[];
    improvementSuggestions: string[];
    scoreJustification: string;
  };
  generatedAt: string;
}

interface CognitiveAnalysisPanelProps {
  runId?: string;
  autoAnalyze?: boolean;
}

export function CognitiveAnalysisPanel({ runId, autoAnalyze = false }: CognitiveAnalysisPanelProps) {
  const [analyses, setAnalyses] = useState<CognitiveAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CognitiveAnalysis | null>(null);
  const [summaryMetrics, setSummaryMetrics] = useState<{
    avgCognitiveDistance: number;
    avgSemanticSimilarity: number;
    avgConceptualAlignment: number;
    totalAnalyses: number;
  } | null>(null);

  // Fetch existing analyses for a run
  const fetchAnalyses = async () => {
    if (!runId) return;

    try {
      const { data: results } = await supabase
        .from('qa_validation_results')
        .select('*')
        .eq('validation_run_id', runId)
        .order('accuracy_score', { ascending: false });

      if (results) {
        // Check if we have cognitive analyses for these results
        const existingAnalyses = results
          .filter(result => result.evaluation_reasoning)
          .map(result => ({
            id: result.id,
            testCaseId: result.test_case_id?.toString() || '',
            question: `Teste ${result.test_case_id || 'N/A'}`,
            expectedAnswer: 'Resposta esperada não disponível',
            actualAnswer: result.actual_answer,
            accuracyScore: result.accuracy_score,
            metrics: parseMetrics(result.evaluation_reasoning),
            analysis: parseAnalysis(result.evaluation_reasoning),
            generatedAt: result.created_at
          }));

        setAnalyses(existingAnalyses);
        calculateSummaryMetrics(existingAnalyses);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  // Generate cognitive analysis for test results
  const generateCognitiveAnalysis = async () => {
    if (!runId) {
      toast.error('Nenhuma execução selecionada para análise');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Call the RL cognitive agent edge function
      const { data, error } = await supabase.functions.invoke('rl-cognitive-agent', {
        body: {
          action: 'analyze_qa_run',
          runId: runId,
          analysisType: 'cognitive_evaluation'
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success('Análise cognitiva gerada com sucesso!');
        fetchAnalyses(); // Refresh the analyses
      } else {
        throw new Error(data.error || 'Erro na análise cognitiva');
      }

    } catch (error) {
      console.error('Error generating cognitive analysis:', error);
      toast.error(`Erro ao gerar análise: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Parse metrics from evaluation reasoning JSON
  const parseMetrics = (reasoning: string): CognitiveMetrics => {
    try {
      const data = JSON.parse(reasoning);
      return data.metrics || {
        semanticSimilarity: 0,
        conceptualAlignment: 0,
        responseCompleteness: 0,
        cognitiveDistance: 1,
        keywordCoverage: 0,
        contextRelevance: 0
      };
    } catch {
      return {
        semanticSimilarity: 0,
        conceptualAlignment: 0,
        responseCompleteness: 0,
        cognitiveDistance: 1,
        keywordCoverage: 0,
        contextRelevance: 0
      };
    }
  };

  // Parse analysis from evaluation reasoning JSON
  const parseAnalysis = (reasoning: string) => {
    try {
      const data = JSON.parse(reasoning);
      return data.analysis || {
        strengths: [],
        weaknesses: [],
        missingConcepts: [],
        irrelevantContent: [],
        improvementSuggestions: [],
        scoreJustification: 'Análise automática não disponível'
      };
    } catch {
      return {
        strengths: [],
        weaknesses: [],
        missingConcepts: [],
        irrelevantContent: [],
        improvementSuggestions: [],
        scoreJustification: 'Erro ao processar análise'
      };
    }
  };

  // Calculate summary metrics
  const calculateSummaryMetrics = (analysisData: CognitiveAnalysis[]) => {
    if (analysisData.length === 0) {
      setSummaryMetrics(null);
      return;
    }

    const totals = analysisData.reduce((acc, analysis) => ({
      cognitiveDistance: acc.cognitiveDistance + analysis.metrics.cognitiveDistance,
      semanticSimilarity: acc.semanticSimilarity + analysis.metrics.semanticSimilarity,
      conceptualAlignment: acc.conceptualAlignment + analysis.metrics.conceptualAlignment
    }), { cognitiveDistance: 0, semanticSimilarity: 0, conceptualAlignment: 0 });

    setSummaryMetrics({
      avgCognitiveDistance: totals.cognitiveDistance / analysisData.length,
      avgSemanticSimilarity: totals.semanticSimilarity / analysisData.length,
      avgConceptualAlignment: totals.conceptualAlignment / analysisData.length,
      totalAnalyses: analysisData.length
    });
  };

  useEffect(() => {
    if (runId) {
      fetchAnalyses();
    }
  }, [runId]);

  useEffect(() => {
    if (autoAnalyze && runId && analyses.length === 0) {
      generateCognitiveAnalysis();
    }
  }, [autoAnalyze, runId, analyses.length]);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Análise Cognitiva QA
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchAnalyses}
                disabled={!runId}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={generateCognitiveAnalysis}
                disabled={isAnalyzing || !runId}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analisando...' : 'Gerar Análise'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {summaryMetrics && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {summaryMetrics.totalAnalyses}
                </div>
                <div className="text-sm text-muted-foreground">Análises</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(1 - summaryMetrics.avgCognitiveDistance)}`}>
                  {((1 - summaryMetrics.avgCognitiveDistance) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Proximidade Cognitiva</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(summaryMetrics.avgSemanticSimilarity)}`}>
                  {(summaryMetrics.avgSemanticSimilarity * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Similaridade Semântica</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(summaryMetrics.avgConceptualAlignment)}`}>
                  {(summaryMetrics.avgConceptualAlignment * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Alinhamento Conceitual</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Analysis Results */}
      {analyses.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="details">Análises Detalhadas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4">
              {analyses.slice(0, 10).map((analysis) => (
                <Card key={analysis.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getScoreBadge(analysis.accuracyScore)}>
                            {(analysis.accuracyScore * 100).toFixed(1)}%
                          </Badge>
                          <Badge variant="outline">
                            Distância: {(analysis.metrics.cognitiveDistance * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <h4 className="font-medium line-clamp-2">
                          {analysis.question}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {analysis.analysis.scoreJustification}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAnalysis(analysis)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details">
            {selectedAnalysis ? (
              <Card>
                <CardHeader>
                  <CardTitle>Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question and Answers */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Pergunta</h4>
                      <p className="text-sm bg-muted p-3 rounded">
                        {selectedAnalysis.question}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Resposta Esperada</h4>
                        <p className="text-sm bg-green-50 p-3 rounded">
                          {selectedAnalysis.expectedAnswer}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Resposta Obtida</h4>
                        <p className="text-sm bg-blue-50 p-3 rounded">
                          {selectedAnalysis.actualAnswer}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Métricas Cognitivas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(selectedAnalysis.metrics).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span>{(value * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={value * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Pontos Fortes
                        </h4>
                        <ul className="text-sm space-y-1">
                          {selectedAnalysis.analysis.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Pontos Fracos
                        </h4>
                        <ul className="text-sm space-y-1">
                          {selectedAnalysis.analysis.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-600">•</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Conceitos Ausentes
                        </h4>
                        <ul className="text-sm space-y-1">
                          {selectedAnalysis.analysis.missingConcepts.map((concept, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-yellow-600">•</span>
                              {concept}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          Sugestões de Melhoria
                        </h4>
                        <ul className="text-sm space-y-1">
                          {selectedAnalysis.analysis.improvementSuggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Score Justification */}
                  <div>
                    <h4 className="font-medium mb-2">Justificativa do Score</h4>
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        {selectedAnalysis.analysis.scoreJustification}
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione uma análise na aba "Visão Geral" para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma Análise Disponível</h3>
            <p className="text-muted-foreground mb-4">
              {runId 
                ? 'Execute uma análise cognitiva para ver os resultados detalhados'
                : 'Selecione uma execução de validação para analisar'
              }
            </p>
            {runId && (
              <Button onClick={generateCognitiveAnalysis} disabled={isAnalyzing}>
                <Zap className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Gerando Análise...' : 'Gerar Análise Cognitiva'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}