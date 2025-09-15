import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, Play, GitCompare, BarChart3, 
  TrendingUp, AlertCircle, CheckCircle, XCircle,
  Clock, Zap, Award, Trash2, AlertTriangle, Activity
} from 'lucide-react';
import { SystemVersionIndicator } from '@/components/admin/SystemVersionIndicator';
import { toast } from 'sonner';
import { Header } from '@/components/Header';

// Novos componentes V3
import { DualRAGValidator } from '@/components/admin/DualRAGValidator';
import { RAGVersionComparator } from '@/components/admin/RAGVersionComparator';
import { UnifiedQAExecutor } from '@/components/admin/UnifiedQAExecutor';
import { QualityMetricsV3 } from '@/components/admin/QualityMetricsV3';

interface QualityMetricsV3Data {
  totalDualRuns: number;
  avgV1Accuracy: number;
  avgV2Accuracy: number;
  avgAccuracyDifference: number;
  v1ResponseTime: number;
  v2ResponseTime: number;
  v1SuccessRate: number;
  v2SuccessRate: number;
  consistencyScore: number;
  lastRunDate: string | null;
}

interface DualValidationProgress {
  isRunning: boolean;
  currentTest: number;
  totalTests: number;
  percentage: number;
  currentVersion: 'v1' | 'v2' | 'comparison';
  status: string;
  v1Complete: boolean;
  v2Complete: boolean;
  comparisonComplete: boolean;
}

interface ValidationConfig {
  testCount: number;
  selectedModel: string;
  includeSQL: boolean;
  excludeSQL: boolean;
}

export default function QualityV3() {
  const [metrics, setMetrics] = useState<QualityMetricsV3Data>({
    totalDualRuns: 0,
    avgV1Accuracy: 0,
    avgV2Accuracy: 0,
    avgAccuracyDifference: 0,
    v1ResponseTime: 0,
    v2ResponseTime: 0,
    v1SuccessRate: 0,
    v2SuccessRate: 0,
    consistencyScore: 0,
    lastRunDate: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('dual-validation');
  const [dualProgress, setDualProgress] = useState<DualValidationProgress>({
    isRunning: false,
    currentTest: 0,
    totalTests: 0,
    percentage: 0,
    currentVersion: 'v1',
    status: '',
    v1Complete: false,
    v2Complete: false,
    comparisonComplete: false
  });

  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-5-sonnet-20241022');

  // Modelos LLM válidos disponíveis
  const availableModels = [
    { value: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recomendado)' },
    { value: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Rápido)' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  // Fetch dados de qualidade V3
  const fetchQualityV3Data = async () => {
    try {
      setIsLoading(true);

      // Buscar execuções duais
      const { data: dualRuns } = await supabase
        .from('qa_dual_validation_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Buscar comparações entre versões
      const { data: comparisons } = await supabase
        .from('rag_version_comparisons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setComparisonData(comparisons || []);

      // Buscar insights de qualidade
      const { data: qualityInsights } = await supabase
        .from('quality_insights_v3')
        .select('*')
        .eq('is_resolved', false)
        .order('impact_score', { ascending: false });

      setInsights(qualityInsights || []);

      if (dualRuns && dualRuns.length > 0) {
        const completedRuns = dualRuns.filter(r => r.status === 'completed');
        
        if (completedRuns.length > 0) {
          const avgV1Accuracy = completedRuns.reduce((sum, run) => sum + (run.v1_accuracy || 0), 0) / completedRuns.length;
          const avgV2Accuracy = completedRuns.reduce((sum, run) => sum + (run.v2_accuracy || 0), 0) / completedRuns.length;
          const avgV1ResponseTime = completedRuns.reduce((sum, run) => sum + (run.avg_response_time_v1 || 0), 0) / completedRuns.length;
          const avgV2ResponseTime = completedRuns.reduce((sum, run) => sum + (run.avg_response_time_v2 || 0), 0) / completedRuns.length;
          
          const v1SuccessRate = completedRuns.filter(r => (r.v1_accuracy || 0) >= 0.7).length / completedRuns.length;
          const v2SuccessRate = completedRuns.filter(r => (r.v2_accuracy || 0) >= 0.7).length / completedRuns.length;
          
          // Calcular score de consistência baseado na diferença entre as versões
          const consistencyScore = 1 - (Math.abs(avgV1Accuracy - avgV2Accuracy));

          setMetrics({
            totalDualRuns: dualRuns.length,
            avgV1Accuracy: Math.round(avgV1Accuracy * 100),
            avgV2Accuracy: Math.round(avgV2Accuracy * 100),
            avgAccuracyDifference: Math.round((avgV2Accuracy - avgV1Accuracy) * 100),
            v1ResponseTime: Math.round(avgV1ResponseTime),
            v2ResponseTime: Math.round(avgV2ResponseTime),
            v1SuccessRate: Math.round(v1SuccessRate * 100),
            v2SuccessRate: Math.round(v2SuccessRate * 100),
            consistencyScore: Math.round(consistencyScore * 100),
            lastRunDate: dualRuns[0]?.created_at || null
          });
        }
      }

    } catch (error) {
      console.error('Error fetching Quality V3 data:', error);
      toast.error('Erro ao carregar dados de qualidade V3');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para executar validação dual
  const handleDualValidation = async (config: ValidationConfig) => {
    try {
      // Validar modelo selecionado
      if (!config.selectedModel) {
        toast.error('Selecione um modelo válido antes de executar a validação');
        return;
      }

      // Verificar se o modelo está na lista de válidos
      const isValidModel = availableModels.some(model => model.value === config.selectedModel);
      if (!isValidModel) {
        toast.error('Modelo selecionado não é válido. Use um modelo LLM da lista.');
        return;
      }

      setDualProgress({
        isRunning: true,
        currentTest: 0,
        totalTests: config.testCount || 10,
        percentage: 0,
        currentVersion: 'v1',
        status: `Iniciando validação com ${config.selectedModel}...`,
        v1Complete: false,
        v2Complete: false,
        comparisonComplete: false
      });

      console.log('🚀 Executando validação dual com configuração:', {
        model: config.selectedModel,
        testCount: config.testCount,
        includeSQL: config.includeSQL,
        excludeSQL: config.excludeSQL
      });

      // Chamar edge function para validação dual com modelo LLM válido
      const { data, error } = await supabase.functions.invoke('qa-execute-validation-v2', {
        body: { 
          mode: 'random',
          randomCount: config.testCount || 10,
          models: [config.selectedModel], // Usar modelo LLM válido
          includeSQL: config.includeSQL || false,
          excludeSQL: config.excludeSQL || false
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('Edge Function retornou dados vazios');
      }

      console.log('✅ Validação dual executada com sucesso:', data);
      toast.success(`Validação dual iniciada com ${config.selectedModel}!`);
      
      // Refresh dados após validação
      setTimeout(() => {
        fetchQualityV3Data();
        setDualProgress(prev => ({ 
          ...prev, 
          isRunning: false,
          status: 'Validação concluída com sucesso',
          percentage: 100,
          v1Complete: true,
          v2Complete: true,
          comparisonComplete: true
        }));
      }, 2000);

    } catch (error) {
      console.error('Dual validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro na validação dual: ${errorMessage}`);
      setDualProgress(prev => ({ 
        ...prev, 
        isRunning: false,
        status: `Erro: ${errorMessage}`
      }));
    }
  };

  useEffect(() => {
    fetchQualityV3Data();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Quality Dashboard V3</h1>
              <p className="text-muted-foreground mt-1">
                Análise comparativa avançada entre RAG V1 e V2
              </p>
            </div>
            <div className="flex gap-3">
              <SystemVersionIndicator />
              <Button 
                variant="outline" 
                onClick={fetchQualityV3Data}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Progress Bar para Validação Dual */}
          {dualProgress.isRunning && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>{dualProgress.status}</span>
                    <span>{dualProgress.percentage}%</span>
                  </div>
                  <Progress value={dualProgress.percentage} />
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {dualProgress.v1Complete ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Clock className="h-3 w-3" />}
                      RAG V1 {dualProgress.v1Complete ? 'Concluído' : 'Em progresso'}
                    </div>
                    <div className="flex items-center gap-2">
                      {dualProgress.v2Complete ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Clock className="h-3 w-3" />}
                      RAG V2 {dualProgress.v2Complete ? 'Concluído' : 'Em progresso'}
                    </div>
                    <div className="flex items-center gap-2">
                      {dualProgress.comparisonComplete ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Clock className="h-3 w-3" />}
                      Comparação {dualProgress.comparisonComplete ? 'Concluída' : 'Pendente'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas Principais V3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execuções Duais</CardTitle>
                <GitCompare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalDualRuns}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.lastRunDate ? `Última: ${new Date(metrics.lastRunDate).toLocaleDateString('pt-BR')}` : 'Nenhuma execução'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acurácia Comparativa</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>V1:</span>
                    <span className="font-medium">{metrics.avgV1Accuracy}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>V2:</span>
                    <span className="font-medium">{metrics.avgV2Accuracy}%</span>
                  </div>
                  <Badge variant={metrics.avgAccuracyDifference >= 0 ? "default" : "destructive"}>
                    {metrics.avgAccuracyDifference >= 0 ? '+' : ''}{metrics.avgAccuracyDifference}% diferença
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>V1:</span>
                    <span className="font-medium">{metrics.v1ResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>V2:</span>
                    <span className="font-medium">{metrics.v2ResponseTime}ms</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.v2ResponseTime < metrics.v1ResponseTime ? 'V2 mais rápido' : 'V1 mais rápido'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Score de Consistência</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.consistencyScore}%</div>
                <Badge variant={metrics.consistencyScore >= 85 ? "default" : metrics.consistencyScore >= 70 ? "secondary" : "destructive"}>
                  {metrics.consistencyScore >= 85 ? "Excelente" : metrics.consistencyScore >= 70 ? "Bom" : "Necessita Atenção"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Alertas de Insights */}
          {insights.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{insights.length} insights</strong> detectados que requerem atenção.
                Verifique a aba "Insights de Qualidade" para mais detalhes.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs Principais */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dual-validation">Validação Dual</TabsTrigger>
              <TabsTrigger value="comparison">Comparação</TabsTrigger>
              <TabsTrigger value="metrics">Métricas Avançadas</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="executor">Executor Unificado</TabsTrigger>
            </TabsList>

            <TabsContent value="dual-validation" className="space-y-4">
              {/* Seletor de Modelo */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuração da Validação Dual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Modelo LLM</label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Selecione o modelo LLM para executar a validação
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                        {selectedModel ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Modelo válido selecionado</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Selecione um modelo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DualRAGValidator 
                onExecute={handleDualValidation}
                isRunning={dualProgress.isRunning}
                progress={dualProgress}
                selectedModel={selectedModel}
              />
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <RAGVersionComparator 
                comparisonData={comparisonData}
                onRefresh={fetchQualityV3Data}
              />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <QualityMetricsV3 
                metrics={metrics}
                comparisonData={comparisonData}
              />
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insights de Qualidade</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum insight de qualidade disponível.</p>
                  ) : (
                    <div className="space-y-4">
                      {insights.map((insight, index) => (
                        <div key={insight.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant={insight.severity === 'critical' ? 'destructive' : insight.severity === 'high' ? 'secondary' : 'outline'}>
                                  {insight.severity}
                                </Badge>
                                <Badge variant="outline">{insight.rag_version}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">Impact: {Math.round(insight.impact_score * 100)}%</div>
                              <div className="text-xs text-muted-foreground">Confidence: {Math.round(insight.confidence_score * 100)}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executor" className="space-y-4">
              <UnifiedQAExecutor 
                onExecute={handleDualValidation}
                isRunning={dualProgress.isRunning}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}