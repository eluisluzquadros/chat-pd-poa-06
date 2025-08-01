import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Clock,
  RefreshCw,
  Play,
  Settings,
  Eye,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KnowledgeGap {
  id: string;
  category: string;
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  failed_query: string;
  actual_answer: string;
  confidence_score: number;
  similar_failures_count: number;
  suggested_action: string;
  status: string;
  detected_at: string;
  priority_score: number;
}

interface ConfidenceMetrics {
  totalQueries: number;
  lowConfidenceQueries: number;
  averageConfidence: number;
  gapsDetected: number;
  gapsResolved: number;
  autoEscalated: number;
}

interface PendingContent {
  id: string;
  gap_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  completeness_score: number;
  knowledge_gaps: KnowledgeGap;
}

export function GapDetectionDashboard() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [pendingContent, setPendingContent] = useState<PendingContent[]>([]);
  const [metrics, setMetrics] = useState<ConfidenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionEnabled, setDetectionEnabled] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch knowledge gaps
      const { data: gapsData } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .order('priority_score', { ascending: false })
        .order('detected_at', { ascending: false })
        .limit(50);

      // Fetch pending content
      const { data: contentData } = await supabase
        .from('knowledge_gap_content')
        .select(`
          *,
          knowledge_gaps (*)
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      // Calculate metrics
      const metricsData = await calculateMetrics();

      setGaps(gapsData || []);
      setPendingContent(contentData || []);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching gap detection data:', error);
      toast.error("Erro ao carregar dados de detecção de gaps");
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async (): Promise<ConfidenceMetrics> => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get confidence monitoring data for today
    const { data: confidenceData } = await supabase
      .from('confidence_monitoring')
      .select('*')
      .gte('monitored_at', `${today}T00:00:00`)
      .lte('monitored_at', `${today}T23:59:59`);

    // Get gaps data
    const { data: gapsData } = await supabase
      .from('knowledge_gaps')
      .select('status')
      .gte('detected_at', `${today}T00:00:00`);

    const totalQueries = confidenceData?.length || 0;
    const lowConfidenceQueries = confidenceData?.filter(c => c.initial_confidence < 0.6).length || 0;
    const averageConfidence = confidenceData?.length > 0 
      ? confidenceData.reduce((sum, c) => sum + c.initial_confidence, 0) / confidenceData.length 
      : 0;
    
    const gapsDetected = gapsData?.length || 0;
    const gapsResolved = gapsData?.filter(g => g.status === 'resolved').length || 0;
    const autoEscalated = confidenceData?.filter(c => c.auto_escalated).length || 0;

    return {
      totalQueries,
      lowConfidenceQueries,
      averageConfidence,
      gapsDetected,
      gapsResolved,
      autoEscalated
    };
  };

  const triggerAnalysis = async (gap: KnowledgeGap) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-updater', {
        body: {
          gap,
          action: 'analyze_and_suggest'
        }
      });

      if (error) throw error;

      toast.success("Análise concluída! Sugestões de conteúdo geradas.");
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error analyzing gap:', error);
      toast.error("Erro ao analisar gap de conhecimento");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateContent = async (gap: KnowledgeGap) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-updater', {
        body: {
          gap,
          action: 'generate_content',
          options: {
            includeExamples: true,
            targetAudience: 'general',
            contentLength: 'detailed'
          }
        }
      });

      if (error) throw error;

      toast.success("Conteúdo gerado! Aguardando revisão para aprovação.");
      await fetchData();
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error("Erro ao gerar conteúdo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const approveContent = async (contentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('knowledge-updater', {
        body: {
          action: 'approve_content',
          contentId
        }
      });

      if (error) throw error;

      toast.success("Conteúdo aprovado e integrado à base de conhecimento!");
      await fetchData();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error("Erro ao aprovar conteúdo");
    }
  };

  const rejectContent = async (contentId: string, reason: string) => {
    try {
      const { error } = await supabase.functions.invoke('knowledge-updater', {
        body: {
          action: 'reject_content',
          contentId,
          reason
        }
      });

      if (error) throw error;

      toast.success("Conteúdo rejeitado. Feedback registrado.");
      await fetchData();
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error("Erro ao rejeitar conteúdo");
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'analyzing': return 'secondary';
      case 'pending_content': return 'outline';
      default: return 'destructive';
    }
  };

  if (loading) {
    return <div className="p-6">Carregando dashboard de detecção de gaps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Detecção Inteligente de Gaps</h2>
          <p className="text-muted-foreground">
            Sistema automático de detecção e resolução de lacunas de conhecimento
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${detectionEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {detectionEnabled ? 'Detecção Ativa' : 'Detecção Inativa'}
            </span>
          </div>
          
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalQueries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.lowConfidenceQueries || 0} com baixa confiança
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.averageConfidence || 0) * 100).toFixed(1)}%
            </div>
            <Progress 
              value={(metrics?.averageConfidence || 0) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gaps Detectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.gapsDetected || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.autoEscalated || 0} auto-escalonados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gaps Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.gapsResolved || 0}</div>
            <div className="text-xs text-muted-foreground">
              {metrics?.gapsDetected > 0 
                ? `${Math.round((metrics.gapsResolved / metrics.gapsDetected) * 100)}% resolvidos`
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conteúdo Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingContent.length}</div>
            <p className="text-xs text-muted-foreground">Aguardando revisão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalQueries > 0 
                ? `${Math.round(((metrics.totalQueries - metrics.lowConfidenceQueries) / metrics.totalQueries) * 100)}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">Respostas confiáveis</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gaps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gaps">Gaps Detectados</TabsTrigger>
          <TabsTrigger value="pending">Conteúdo Pendente</TabsTrigger>
          <TabsTrigger value="resolved">Gaps Resolvidos</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gaps de Conhecimento Detectados</CardTitle>
              <CardDescription>
                Lacunas identificadas automaticamente quando a confiança da IA é baixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gaps.filter(g => g.status !== 'resolved').length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Ótimo! Nenhum gap crítico detectado no momento.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {gaps
                    .filter(gap => gap.status !== 'resolved')
                    .map((gap) => (
                      <Card 
                        key={gap.id} 
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
                                <Badge variant={getStatusColor(gap.status)}>
                                  {gap.status}
                                </Badge>
                                <Badge variant="outline">{gap.category}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  Prioridade: {gap.priority_score}/10
                                </span>
                              </div>
                              
                              <h4 className="font-medium">{gap.topic}</h4>
                              
                              <div className="text-sm text-muted-foreground">
                                <strong>Consulta que falhou:</strong>
                                <p className="mt-1 truncate max-w-md">{gap.failed_query}</p>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <span>
                                  Confiança: {(gap.confidence_score * 100).toFixed(1)}%
                                </span>
                                <span>
                                  Falhas similares: {gap.similar_failures_count}
                                </span>
                                <span>
                                  {new Date(gap.detected_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAnalysis(gap);
                                }}
                                disabled={isAnalyzing}
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                Analisar
                              </Button>
                              
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateContent(gap);
                                }}
                                disabled={isAnalyzing}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Gerar Conteúdo
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo Aguardando Revisão</CardTitle>
              <CardDescription>
                Conteúdo gerado automaticamente que precisa de aprovação humana
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingContent.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum conteúdo aguardando revisão
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingContent.map((content) => (
                    <Card key={content.id}>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{content.knowledge_gaps.category}</Badge>
                                <Badge variant="secondary">{content.knowledge_gaps.topic}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(content.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              
                              <h4 className="font-medium">{content.title}</h4>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Show content preview modal
                                  toast.info("Preview do conteúdo (implementar modal)");
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>
                              
                              <Button
                                size="sm"
                                onClick={() => approveContent(content.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectContent(content.id, 'Necessita revisão')}
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Rejeitar
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-2">Preview do conteúdo:</p>
                            <div className="bg-muted/50 p-3 rounded max-h-32 overflow-y-auto">
                              {content.content.substring(0, 300)}...
                            </div>
                          </div>
                          
                          {content.completeness_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Completude:</span>
                              <Progress 
                                value={content.completeness_score * 100} 
                                className="w-32 h-2"
                              />
                              <span className="text-sm text-muted-foreground">
                                {(content.completeness_score * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gaps Resolvidos</CardTitle>
              <CardDescription>
                Histórico de gaps que foram identificados e resolvidos com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gaps
                  .filter(gap => gap.status === 'resolved')
                  .map((gap) => (
                    <div 
                      key={gap.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{gap.topic}</span>
                          <Badge variant="outline">{gap.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {gap.failed_query}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        Resolvido em {new Date(gap.detected_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Confiança</CardTitle>
              <CardDescription>
                Configurações e métricas do sistema de detecção automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium">Configurações</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Limite de Confiança</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0.1" 
                          max="0.9" 
                          step="0.05" 
                          defaultValue="0.6"
                          className="flex-1"
                        />
                        <span className="text-sm">60%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Detectar gaps quando confiança for menor que este valor
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Auto-escalonamento</label>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked readOnly />
                        <span className="text-sm">Ativar para gaps críticos</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Escalonar automaticamente gaps com confiança &lt; 30%
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Real-time Status */}
                <div className="space-y-4">
                  <h4 className="font-medium">Status em Tempo Real</h4>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">{metrics?.lowConfidenceQueries || 0}</p>
                      <p className="text-sm text-muted-foreground">Queries baixa confiança (hoje)</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-2xl font-bold">{gaps.filter(g => g.status === 'analyzing').length}</p>
                      <p className="text-sm text-muted-foreground">Gaps em análise</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{pendingContent.length}</p>
                      <p className="text-sm text-muted-foreground">Conteúdo pendente</p>
                    </div>
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