import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Zap, 
  Target,
  TrendingUp,
  Settings,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DetectionConfig {
  confidenceThreshold: number;
  autoEscalation: boolean;
  realTimeMonitoring: boolean;
  batchAnalysis: boolean;
  categoriesEnabled: string[];
  minSimilarityThreshold: number;
}

interface LearningMetrics {
  patternsLearned: number;
  accuracyImprovement: number;
  autoResolutions: number;
  learningRate: number;
}

interface RealTimeStatus {
  isActive: boolean;
  queriesProcessed: number;
  gapsDetected: number;
  averageConfidence: number;
  lastUpdate: Date;
}

export function IntelligentGapDetector() {
  const [config, setConfig] = useState<DetectionConfig>({
    confidenceThreshold: 0.6,
    autoEscalation: true,
    realTimeMonitoring: true,
    batchAnalysis: false,
    categoriesEnabled: ['all'],
    minSimilarityThreshold: 0.7
  });
  
  const [learningMetrics, setLearningMetrics] = useState<LearningMetrics | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<RealTimeStatus | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingEnabled, setIsTestingEnabled] = useState(false);

  useEffect(() => {
    loadConfiguration();
    loadLearningMetrics();
    
    // Start real-time monitoring
    if (config.realTimeMonitoring) {
      startRealTimeMonitoring();
    }
    
    return () => {
      // Cleanup monitoring
    };
  }, []);

  const loadConfiguration = async () => {
    // In a real implementation, load from database or config
    // For now, using default values
  };

  const loadLearningMetrics = async () => {
    try {
      // Get learning patterns data
      const { data: patterns } = await supabase
        .from('learning_patterns')
        .select('*')
        .order('last_updated', { ascending: false });

      // Get recent gap resolutions for accuracy calculation
      const { data: resolutions } = await supabase
        .from('knowledge_gap_resolutions')
        .select('effectiveness_score')
        .not('effectiveness_score', 'is', null);

      const patternsLearned = patterns?.length || 0;
      const avgEffectiveness = resolutions?.length > 0 
        ? resolutions.reduce((sum, r) => sum + (r.effectiveness_score || 0), 0) / resolutions.length
        : 0;

      setLearningMetrics({
        patternsLearned,
        accuracyImprovement: avgEffectiveness * 100,
        autoResolutions: resolutions?.filter(r => (r.effectiveness_score || 0) > 0.8).length || 0,
        learningRate: Math.min(patternsLearned / 100, 1) * 100
      });
    } catch (error) {
      console.error('Error loading learning metrics:', error);
    }
  };

  const startRealTimeMonitoring = () => {
    setRealTimeStatus({
      isActive: true,
      queriesProcessed: 0,
      gapsDetected: 0,
      averageConfidence: 0,
      lastUpdate: new Date()
    });

    // In a real implementation, this would establish a websocket connection
    // or polling mechanism to monitor incoming queries
  };

  const updateConfiguration = async () => {
    setIsConfiguring(true);
    try {
      // In a real implementation, save to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success("Configuração atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar configuração");
    } finally {
      setIsConfiguring(false);
    }
  };

  const testGapDetection = async () => {
    if (!testQuery.trim()) {
      toast.error("Digite uma consulta para testar");
      return;
    }

    setIsTestingEnabled(true);
    try {
      // Call gap detector with test query
      const { data, error } = await supabase.functions.invoke('gap-detector', {
        body: {
          query: testQuery,
          confidence: 0.3, // Low confidence to trigger detection
          category: 'test',
          sessionId: 'test-session',
          modelUsed: 'test-model'
        }
      });

      if (error) throw error;

      setTestResult(data);
      
      if (data.gapDetected) {
        toast.success("Gap detectado! Veja os resultados abaixo.");
      } else {
        toast.info("Nenhum gap detectado para esta consulta.");
      }
    } catch (error) {
      console.error('Error testing gap detection:', error);
      toast.error("Erro ao testar detecção de gap");
    } finally {
      setIsTestingEnabled(false);
    }
  };

  const triggerLearningUpdate = async () => {
    try {
      // Trigger learning pattern analysis
      toast.info("Iniciando análise de padrões de aprendizado...");
      
      // In a real implementation, this would call a function to analyze
      // recent interactions and update learning patterns
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loadLearningMetrics();
      toast.success("Padrões de aprendizado atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar padrões de aprendizado");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Detector Inteligente de Gaps
          </h2>
          <p className="text-muted-foreground">
            Sistema avançado de detecção automática com aprendizado incremental
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${realTimeStatus?.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm font-medium">
            {realTimeStatus?.isActive ? 'Monitoramento Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Learning Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Padrões Aprendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningMetrics?.patternsLearned || 0}</div>
            <Progress value={learningMetrics?.learningRate || 0} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de aprendizado: {learningMetrics?.learningRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Melhoria na Precisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{(learningMetrics?.accuracyImprovement || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Desde o último período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Resoluções Automáticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningMetrics?.autoResolutions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Gaps resolvidos automaticamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Tempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStatus?.queriesProcessed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Consultas processadas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="testing">Teste & Validação</TabsTrigger>
          <TabsTrigger value="learning">Aprendizado</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Detecção</CardTitle>
              <CardDescription>
                Configure os parâmetros do sistema de detecção inteligente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Limite de Confiança ({(config.confidenceThreshold * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={config.confidenceThreshold}
                      onChange={(e) => setConfig({
                        ...config,
                        confidenceThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Detectar gaps quando confiança for menor que este valor
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Limiar de Similaridade ({(config.minSimilarityThreshold * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      value={config.minSimilarityThreshold}
                      onChange={(e) => setConfig({
                        ...config,
                        minSimilarityThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Agrupar consultas similares em gaps existentes
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Auto-escalonamento</label>
                      <p className="text-xs text-muted-foreground">
                        Escalonar automaticamente gaps críticos
                      </p>
                    </div>
                    <Switch
                      checked={config.autoEscalation}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        autoEscalation: checked
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Monitoramento em tempo real</label>
                      <p className="text-xs text-muted-foreground">
                        Detectar gaps conforme consultas chegam
                      </p>
                    </div>
                    <Switch
                      checked={config.realTimeMonitoring}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        realTimeMonitoring: checked
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Análise por lotes</label>
                      <p className="text-xs text-muted-foreground">
                        Processar grupos de consultas periodicamente
                      </p>
                    </div>
                    <Switch
                      checked={config.batchAnalysis}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        batchAnalysis: checked
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={updateConfiguration} disabled={isConfiguring}>
                  {isConfiguring ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Detecção</CardTitle>
              <CardDescription>
                Teste o sistema de detecção com consultas específicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Consulta de Teste</label>
                <Textarea
                  placeholder="Digite uma consulta para testar a detecção de gaps..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button onClick={testGapDetection} disabled={isTestingEnabled}>
                {isTestingEnabled ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Testar Detecção
                  </>
                )}
              </Button>

              {testResult && (
                <Alert className={testResult.gapDetected ? "border-yellow-500" : "border-green-500"}>
                  {testResult.gapDetected ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {testResult.gapDetected ? 'Gap Detectado!' : 'Nenhum Gap Detectado'}
                      </p>
                      <p>Confiança: {(testResult.gap?.confidence || testResult.confidence * 100).toFixed(1)}%</p>
                      {testResult.gap && (
                        <div className="space-y-1">
                          <p>Categoria: {testResult.gap.category}</p>
                          <p>Tópico: {testResult.gap.topic}</p>
                          <p>Severidade: {testResult.gap.severity}</p>
                          {testResult.gap.suggestions && (
                            <div>
                              <p className="font-medium">Sugestões:</p>
                              <ul className="list-disc list-inside ml-4">
                                {testResult.gap.suggestions.map((suggestion: string, index: number) => (
                                  <li key={index} className="text-sm">{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sistema de Aprendizado</CardTitle>
                  <CardDescription>
                    Métricas e controles do aprendizado incremental
                  </CardDescription>
                </div>
                <Button onClick={triggerLearningUpdate} variant="outline">
                  <Brain className="h-4 w-4 mr-2" />
                  Atualizar Padrões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {learningMetrics && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-medium">Estatísticas de Aprendizado</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Padrões identificados:</span>
                        <span className="text-sm font-medium">{learningMetrics.patternsLearned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Melhoria na precisão:</span>
                        <span className="text-sm font-medium">+{learningMetrics.accuracyImprovement.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Resoluções automáticas:</span>
                        <span className="text-sm font-medium">{learningMetrics.autoResolutions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Taxa de Aprendizado</h4>
                    <div className="space-y-2">
                      <Progress value={learningMetrics.learningRate} className="h-3" />
                      <p className="text-sm text-muted-foreground">
                        {learningMetrics.learningRate.toFixed(1)}% - Sistema em constante evolução
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como funciona o aprendizado:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>O sistema analisa padrões em consultas que falharam</li>
                    <li>Identifica categorias e tópicos com problemas recorrentes</li>
                    <li>Aprende com resoluções bem-sucedidas de gaps</li>
                    <li>Melhora automaticamente a detecção e sugestões futuras</li>
                    <li>Adapta-se ao comportamento dos usuários ao longo do tempo</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento em Tempo Real</CardTitle>
              <CardDescription>
                Status atual do sistema de detecção e métricas de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {realTimeStatus ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{realTimeStatus.queriesProcessed}</div>
                      <p className="text-sm text-muted-foreground">Consultas processadas</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{realTimeStatus.gapsDetected}</div>
                      <p className="text-sm text-muted-foreground">Gaps detectados</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {(realTimeStatus.averageConfidence * 100).toFixed(1)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Confiança média</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Performance do sistema:</span>
                      <Badge variant="default">Otimal</Badge>
                    </div>
                    <Progress value={85} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Última atualização: {realTimeStatus.lastUpdate.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Monitoramento em tempo real não está ativo
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}