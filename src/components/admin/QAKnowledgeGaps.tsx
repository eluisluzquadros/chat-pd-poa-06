import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, AlertTriangle, Lightbulb, FileText, Database, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KnowledgeUpdateDialog } from "./KnowledgeUpdateDialog";

interface FailedTestCase {
  id: string;
  question: string;
  expected_answer: string;
  actual_answer: string;
  accuracy_score: number;
  category: string;
  tags: string[];
  error_type?: string;
  attempts: number;
}

interface KnowledgeGap {
  category: string;
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  failedTests: FailedTestCase[];
  suggestedAction: string;
  relatedDocuments?: string[];
}

export function QAKnowledgeGaps() {
  const [loading, setLoading] = useState(true);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateAnalysisData, setUpdateAnalysisData] = useState<any>(null);

  useEffect(() => {
    analyzeKnowledgeGaps();
  }, []);

  const analyzeKnowledgeGaps = async () => {
    setLoading(true);
    try {
      // Get latest validation run
      const { data: latestRun } = await supabase
        .from('qa_validation_runs')
        .select('id')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestRun) {
        setGaps([]);
        return;
      }

      // Get failed test cases
      const { data: failedResults } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (
            id,
            question,
            expected_answer,
            category,
            tags
          )
        `)
        .eq('validation_run_id', latestRun.id)
        .eq('is_correct', false)
        .order('accuracy_score', { ascending: true });

      if (!failedResults || failedResults.length === 0) {
        setGaps([]);
        return;
      }

      // Analyze patterns in failures
      const gapAnalysis = analyzeFailurePatterns(failedResults);
      setGaps(gapAnalysis);

    } catch (error) {
      console.error('Error analyzing knowledge gaps:', error);
      toast.error("Erro ao analisar gaps de conhecimento");
    } finally {
      setLoading(false);
    }
  };

  const analyzeFailurePatterns = (failures: any[]): KnowledgeGap[] => {
    const gapMap = new Map<string, KnowledgeGap>();

    failures.forEach(failure => {
      const testCase = failure.qa_test_cases;
      const category = testCase.category;
      
      // Extract topic from question and answer patterns
      const topic = extractTopic(testCase.question, testCase.expected_answer);
      const key = `${category}-${topic}`;

      if (!gapMap.has(key)) {
        gapMap.set(key, {
          category,
          topic,
          severity: 'medium',
          failedTests: [],
          suggestedAction: ''
        });
      }

      const gap = gapMap.get(key)!;
      gap.failedTests.push({
        id: testCase.id,
        question: testCase.question,
        expected_answer: testCase.expected_answer,
        actual_answer: failure.actual_answer || 'Sem resposta',
        accuracy_score: failure.accuracy_score,
        category: testCase.category,
        tags: testCase.tags || [],
        error_type: failure.error_type,
        attempts: 1 // TODO: Track actual attempts
      });
    });

    // Calculate severity and suggest actions
    const gaps = Array.from(gapMap.values()).map(gap => {
      // Severity based on number of failures and accuracy scores
      const avgAccuracy = gap.failedTests.reduce((sum, test) => sum + test.accuracy_score, 0) / gap.failedTests.length;
      
      if (gap.failedTests.length >= 5 || avgAccuracy < 0.2) {
        gap.severity = 'critical';
      } else if (gap.failedTests.length >= 3 || avgAccuracy < 0.4) {
        gap.severity = 'high';
      } else if (avgAccuracy < 0.6) {
        gap.severity = 'medium';
      } else {
        gap.severity = 'low';
      }

      // Suggest actions based on patterns
      gap.suggestedAction = generateSuggestedAction(gap);

      return gap;
    });

    // Sort by severity
    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

  const extractTopic = (question: string, expectedAnswer: string): string => {
    // Simple topic extraction - can be enhanced with NLP
    const keywords = [
      'coeficiente', 'altura', 'zoneamento', 'mobilidade', 'habitação',
      'área verde', 'patrimônio', 'uso do solo', 'infraestrutura'
    ];

    const text = `${question} ${expectedAnswer}`.toLowerCase();
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }

    return 'geral';
  };

  const generateSuggestedAction = (gap: KnowledgeGap): string => {
    const failureCount = gap.failedTests.length;
    const hasNoAnswer = gap.failedTests.some(test => 
      test.actual_answer.includes('não tenho') || 
      test.actual_answer.includes('não consigo')
    );

    if (hasNoAnswer) {
      return `Adicionar documentação sobre ${gap.topic} na categoria ${gap.category}. Base de conhecimento não possui informações suficientes.`;
    }

    if (gap.severity === 'critical') {
      return `Urgente: Revisar e expandir conteúdo sobre ${gap.topic}. ${failureCount} testes falhando consistentemente.`;
    }

    if (gap.severity === 'high') {
      return `Melhorar precisão das respostas sobre ${gap.topic}. Considerar adicionar exemplos específicos.`;
    }

    return `Refinar contexto para perguntas sobre ${gap.topic} em ${gap.category}.`;
  };

  const triggerKnowledgeUpdate = async (gap: KnowledgeGap) => {
    setAnalysisInProgress(true);
    try {
      // Enhanced local analysis with more actionable insights
      const insights = generateLocalInsights(gap);
      const recommendations = generateRecommendations(gap);
      
      // Save insight to qa_learning_insights table
      await supabase.from('qa_learning_insights').insert({
        insight_type: 'knowledge_gap',
        category: gap.category,
        model: 'system',
        insight_data: {
          topic: gap.topic,
          severity: gap.severity,
          failed_tests_count: gap.failedTests.length,
          avg_accuracy: gap.failedTests.reduce((sum, t) => sum + t.accuracy_score, 0) / gap.failedTests.length,
          suggested_action: gap.suggestedAction,
          failed_questions: gap.failedTests.map(t => t.question)
        },
        confidence_score: gap.severity === 'critical' ? 0.9 : gap.severity === 'high' ? 0.8 : 0.7
      });
      
      toast.success("Gap de conhecimento registrado para ação");
      
      setUpdateAnalysisData({
        insights,
        gap,
        recommendations
      });
      setShowUpdateDialog(true);

    } catch (error) {
      console.error('Error triggering knowledge update:', error);
      toast.error("Erro ao analisar gap de conhecimento");
    } finally {
      setAnalysisInProgress(false);
    }
  };

  const generateLocalInsights = (gap: KnowledgeGap) => {
    return {
      analysis: `Identificado gap em ${gap.topic} (${gap.category}) com ${gap.failedTests.length} falhas.`,
      patterns: gap.failedTests.map(test => ({
        issue: test.actual_answer.includes('não tenho') ? 'Falta de informação' : 'Resposta imprecisa',
        question: test.question,
        expectedAnswer: test.expected_answer
      })),
      severity: gap.severity
    };
  };

  const generateRecommendations = (gap: KnowledgeGap) => {
    return [
      `Adicionar mais documentação sobre ${gap.topic}`,
      `Melhorar exemplos para categoria ${gap.category}`,
      `Revisar prompt do sistema para incluir ${gap.topic}`,
      'Considerar adicionar casos de teste específicos'
    ];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
              </div>
              <div className="h-9 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle>Análise de Gaps de Conhecimento</CardTitle>
            </div>
            <Button onClick={analyzeKnowledgeGaps} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reanalisar
            </Button>
          </div>
          <CardDescription>
            Identificação de áreas onde o agente precisa melhorar baseado nos testes falhos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Nenhum gap significativo identificado! O agente está performando bem.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {gaps.map((gap, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedGap(gap)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(gap.severity)}>
                            {gap.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{gap.category}</Badge>
                          <span className="font-medium">{gap.topic}</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {gap.failedTests.length} testes falhando
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <p className="text-sm">{gap.suggestedAction}</p>
                        </div>
                        
                        <Progress 
                          value={100 - (gap.failedTests[0]?.accuracy_score || 0) * 100} 
                          className="w-full h-2"
                        />
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerKnowledgeUpdate(gap);
                        }}
                        disabled={analysisInProgress}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Atualizar Base
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Gap Analysis */}
      {selectedGap && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Gap: {selectedGap.topic}</CardTitle>
            <CardDescription>
              Análise detalhada dos testes que falharam nesta área
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="failures">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="failures">Falhas</TabsTrigger>
                <TabsTrigger value="patterns">Padrões</TabsTrigger>
                <TabsTrigger value="actions">Ações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="failures" className="space-y-4">
                {selectedGap.failedTests.map((test, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-medium">{test.question}</h4>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Esperado:</p>
                          <p className="text-green-600">{test.expected_answer}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Recebido:</p>
                          <p className="text-red-600">{test.actual_answer}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Acurácia: {(test.accuracy_score * 100).toFixed(1)}%
                        </Badge>
                        {test.error_type && (
                          <Badge variant="destructive">{test.error_type}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="patterns" className="space-y-4">
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Padrões Identificados:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• {selectedGap.failedTests.length} perguntas sobre {selectedGap.topic} falharam</li>
                      <li>• Categoria principal: {selectedGap.category}</li>
                      <li>• Acurácia média: {(selectedGap.failedTests.reduce((sum, t) => sum + t.accuracy_score, 0) / selectedGap.failedTests.length * 100).toFixed(1)}%</li>
                      <li>• Tipo de erro mais comum: {selectedGap.failedTests.some(t => t.actual_answer.includes('não tenho')) ? 'Falta de informação' : 'Resposta imprecisa'}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Ação Sugerida:</strong> {selectedGap.suggestedAction}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => triggerKnowledgeUpdate(selectedGap)}
                      disabled={analysisInProgress}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Iniciar Atualização Automática
                    </Button>
                    
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* Knowledge Update Dialog */}
      <KnowledgeUpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        analysisData={updateAnalysisData}
        gap={selectedGap}
      />
    </div>
  );
}