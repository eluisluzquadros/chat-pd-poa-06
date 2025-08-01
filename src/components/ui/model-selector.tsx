import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LLMProvider, ModelPerformance, LLMComparison } from '@/types/chat';
import { llmMetricsService } from '@/services/llmMetricsService';
import { Clock, Zap, DollarSign, Award, Cpu, Eye, Brain, Gauge } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: LLMProvider;
  onModelChange: (model: LLMProvider) => void;
  showComparison?: boolean;
}

const modelInfo: Record<LLMProvider, { 
  name: string; 
  description: string; 
  strengths: string[]; 
  icon: React.ReactNode;
  tier: 'economy' | 'balanced' | 'premium' | 'enterprise';
}> = {
  'openai': {
    name: 'OpenAI GPT-4o',
    description: 'Modelo equilibrado com boa performance geral',
    strengths: ['Versatilidade', 'Qualidade consistente', 'Amplo conhecimento'],
    icon: <Brain className="h-5 w-5" />,
    tier: 'balanced'
  },
  'gpt-4.5': {
    name: 'GPT-4.5 Turbo',
    description: 'Próxima geração com capacidades avançadas',
    strengths: ['Raciocínio superior', 'Análise complexa', 'Contexto longo'],
    icon: <Cpu className="h-5 w-5" />,
    tier: 'enterprise'
  },
  'claude': {
    name: 'Claude 3.5 Sonnet',
    description: 'Assistente avançado da Anthropic',
    strengths: ['Segurança', 'Análise detalhada', 'Ética'],
    icon: <Award className="h-5 w-5" />,
    tier: 'premium'
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    description: 'Modelo mais poderoso da série Claude 3',
    strengths: ['Máxima qualidade', 'Raciocínio complexo', 'Criatividade'],
    icon: <Award className="h-5 w-5" />,
    tier: 'enterprise'
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    description: 'Equilíbrio ideal entre performance e custo',
    strengths: ['Versatilidade', 'Eficiência', 'Qualidade'],
    icon: <Gauge className="h-5 w-5" />,
    tier: 'balanced'
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku',
    description: 'Resposta rápida e eficiente',
    strengths: ['Velocidade', 'Economia', 'Concisão'],
    icon: <Zap className="h-5 w-5" />,
    tier: 'economy'
  },
  'gemini': {
    name: 'Gemini 1.5 Flash',
    description: 'Modelo rápido e eficiente do Google',
    strengths: ['Velocidade', 'Contexto longo', 'Multimodal'],
    icon: <Zap className="h-5 w-5" />,
    tier: 'balanced'
  },
  'gemini-pro': {
    name: 'Gemini 1.5 Pro',
    description: 'Versão avançada com capacidades premium',
    strengths: ['Qualidade superior', 'Análise profunda', 'Multimodal'],
    icon: <Brain className="h-5 w-5" />,
    tier: 'premium'
  },
  'gemini-pro-vision': {
    name: 'Gemini Pro Vision',
    description: 'Processamento avançado de imagens e texto',
    strengths: ['Análise visual', 'Multimodal', 'Documentos'],
    icon: <Eye className="h-5 w-5" />,
    tier: 'premium'
  },
  'llama': {
    name: 'Llama 3.1',
    description: 'Modelo open-source local',
    strengths: ['Privacidade', 'Sem custo', 'Customizável'],
    icon: <Cpu className="h-5 w-5" />,
    tier: 'economy'
  },
  'deepseek': {
    name: 'DeepSeek Coder',
    description: 'Especializado em código e análise técnica',
    strengths: ['Programação', 'Análise técnica', 'Custo baixo'],
    icon: <Brain className="h-5 w-5" />,
    tier: 'economy'
  },
  'groq': {
    name: 'Groq Lightning',
    description: 'Ultra-rápido com hardware especializado',
    strengths: ['Velocidade extrema', 'Baixa latência', 'Eficiência'],
    icon: <Zap className="h-5 w-5" />,
    tier: 'balanced'
  }
};

const tierColors = {
  economy: 'bg-green-100 text-green-800 border-green-200',
  balanced: 'bg-blue-100 text-blue-800 border-blue-200',
  premium: 'bg-purple-100 text-purple-800 border-purple-200',
  enterprise: 'bg-orange-100 text-orange-800 border-orange-200'
};

export function ModelSelector({ selectedModel, onModelChange, showComparison = true }: ModelSelectorProps) {
  const [comparison, setComparison] = useState<LLMComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (showComparison) {
      loadComparison();
    }
  }, [showComparison]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const data = await llmMetricsService.compareModels(7);
      setComparison(data);
    } catch (error) {
      console.error('Failed to load model comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    setLoading(true);
    try {
      const results = await llmMetricsService.benchmarkAllModels();
      setBenchmarkResults(results);
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 0) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.001) return '< $0.001';
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Seleção de Modelo LLM
          </CardTitle>
          <CardDescription>
            Escolha o modelo de linguagem que melhor atende suas necessidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedModel} onValueChange={(value: LLMProvider) => onModelChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um modelo..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(modelInfo).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-3">
                    {info.icon}
                    <div>
                      <div className="font-medium">{info.name}</div>
                      <div className="text-sm text-muted-foreground">{info.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Selected Model Info */}
          {selectedModel && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {modelInfo[selectedModel].icon}
                  <h3 className="font-semibold">{modelInfo[selectedModel].name}</h3>
                </div>
                <Badge className={tierColors[modelInfo[selectedModel].tier]}>
                  {modelInfo[selectedModel].tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {modelInfo[selectedModel].description}
              </p>
              <div className="flex flex-wrap gap-1">
                {modelInfo[selectedModel].strengths.map((strength, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Comparação de Performance
                </CardTitle>
                <CardDescription>
                  Métricas de performance dos últimos 7 dias
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={loadComparison} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  Atualizar
                </Button>
                <Button 
                  onClick={runBenchmark} 
                  disabled={loading}
                  size="sm"
                >
                  Benchmark
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="speed">Velocidade</TabsTrigger>
                  <TabsTrigger value="quality">Qualidade</TabsTrigger>
                  <TabsTrigger value="cost">Custo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  {comparison && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Mais Rápido
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="font-semibold">{comparison.bestForSpeed.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatLatency(comparison.bestForSpeed.averageResponseTime)}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Award className="h-4 w-4 text-purple-500" />
                            Melhor Qualidade
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="font-semibold">{comparison.bestForQuality.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {comparison.bestForQuality.averageQualityScore.toFixed(1)}/100
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Mais Econômico
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="font-semibold">{comparison.bestForCost.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCost(comparison.bestForCost.averageCost)}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-blue-500" />
                            Recomendado
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="font-semibold">{comparison.recommendedModel.model}</div>
                          <div className="text-xs text-muted-foreground">
                            Melhor equilíbrio geral
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="speed" className="space-y-4">
                  {comparison?.models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{model.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatLatency(model.averageResponseTime)}
                          </div>
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress 
                          value={Math.max(0, 100 - (model.averageResponseTime / 50))} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="quality" className="space-y-4">
                  {comparison?.models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{model.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.averageQualityScore.toFixed(1)}/100
                          </div>
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress 
                          value={model.averageQualityScore} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="cost" className="space-y-4">
                  {comparison?.models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{model.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCost(model.averageCost)} por consulta
                          </div>
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress 
                          value={Math.max(0, 100 - (model.averageCost * 10000))} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benchmark Results */}
      {Object.keys(benchmarkResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Resultados do Benchmark
            </CardTitle>
            <CardDescription>
              Teste de latência em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(benchmarkResults).map(([modelKey, latency]) => (
                <div key={modelKey} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="font-medium">{modelKey}</span>
                  <span className={`font-mono text-sm ${latency < 1000 ? 'text-green-600' : latency < 2000 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {formatLatency(latency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}