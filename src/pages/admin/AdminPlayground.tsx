import React, { useState, useEffect } from 'react';
import { Play, TestTube, Zap, Users, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAgents } from '@/hooks/useAgents';
import { chatService } from '@/services/chatService';

interface TestResult {
  id: string;
  agentId: string;
  agentName: string;
  message: string;
  response: string;
  confidence: number;
  executionTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: any;
}

interface ComparisonTest {
  message: string;
  results: TestResult[];
  timestamp: Date;
}

export default function AdminPlayground() {
  const { agents, loading: agentsLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedAgentsForComparison, setSelectedAgentsForComparison] = useState<string[]>([]);
  const [comparisonTests, setComparisonTests] = useState<ComparisonTest[]>([]);

  // Filtrar apenas agentes ativos
  const activeAgents = agents.filter(agent => agent.is_active);

  // Exemplos de mensagens para teste
  const testMessages = [
    "Olá! Como você pode me ajudar com questões de planejamento urbano?",
    "Qual é o coeficiente de aproveitamento máximo para zona residencial?",
    "Como funciona o processo de licenciamento para construção de um prédio?",
    "Quais são as regras para estacionamento em edifícios comerciais?",
    "Explique as normas de recuo obrigatório para construções."
  ];

  const executeTest = async (agentId: string, message: string): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 [Admin Playground] Testing agent ${agentId} with message: ${message.substring(0, 50)}...`);
      
      // Usar o chatService mas em modo de teste (não salva no histórico)
      const result = await chatService.processMessage(
        message,
        'admin', // userRole
        `playground-test-${Date.now()}`, // sessionId temporário
        agentId // model/agentId
      );

      const executionTime = Date.now() - startTime;
      const agent = agents.find(a => a.id === agentId);

      return {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        agentName: agent?.display_name || agent?.name || 'Unknown Agent',
        message,
        response: result.response,
        confidence: result.confidence,
        executionTime: result.executionTime || executionTime,
        timestamp: new Date(),
        success: true,
        metadata: {
          sources: result.sources,
          selectedAgent: result.selectedAgent
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const agent = agents.find(a => a.id === agentId);
      
      console.error(`❌ [Admin Playground] Test failed for agent ${agentId}:`, error);
      
      return {
        id: `test-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        agentName: agent?.display_name || agent?.name || 'Unknown Agent',
        message,
        response: '',
        confidence: 0,
        executionTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleSingleTest = async () => {
    if (!selectedAgent || !testMessage.trim()) return;

    setTesting(true);
    try {
      const result = await executeTest(selectedAgent, testMessage);
      setTestResults(prev => [result, ...prev]);
    } finally {
      setTesting(false);
    }
  };

  const handleComparisonTest = async () => {
    if (selectedAgentsForComparison.length < 2 || !testMessage.trim()) return;

    setTesting(true);
    try {
      console.log(`🧪 [Admin Playground] Running comparison test with ${selectedAgentsForComparison.length} agents`);
      
      // Executar testes em paralelo para comparação
      const results = await Promise.all(
        selectedAgentsForComparison.map(agentId => executeTest(agentId, testMessage))
      );

      const comparisonTest: ComparisonTest = {
        message: testMessage,
        results,
        timestamp: new Date()
      };

      setComparisonTests(prev => [comparisonTest, ...prev]);
      setTestResults(prev => [...results, ...prev]);
    } finally {
      setTesting(false);
    }
  };

  const handleQuickTest = (message: string) => {
    setTestMessage(message);
  };

  const clearResults = () => {
    setTestResults([]);
    setComparisonTests([]);
  };

  const formatExecutionTime = (time: number) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Playground</h1>
          <p className="text-muted-foreground">
            Ambiente isolado para testes de agentes externos sem impactar usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={comparisonMode ? "default" : "outline"}
            onClick={() => setComparisonMode(!comparisonMode)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {comparisonMode ? 'Modo Comparação' : 'Teste Individual'}
          </Button>
          {testResults.length > 0 && (
            <Button onClick={clearResults} variant="outline">
              Limpar Resultados
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Teste */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Configuração do Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!comparisonMode ? (
                <div>
                  <Label htmlFor="agent-select">Agente para Teste</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span>{agent.display_name}</span>
                            <Badge variant="outline">{agent.provider}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Agentes para Comparação</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activeAgents.map(agent => (
                      <label key={agent.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedAgentsForComparison.includes(agent.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAgentsForComparison(prev => [...prev, agent.id]);
                            } else {
                              setSelectedAgentsForComparison(prev => prev.filter(id => id !== agent.id));
                            }
                          }}
                        />
                        <span>{agent.display_name}</span>
                        <Badge variant="outline" className="text-xs">{agent.provider}</Badge>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione pelo menos 2 agentes para comparação
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="test-message">Mensagem de Teste</Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Digite sua mensagem de teste..."
                  rows={4}
                />
              </div>

              <Button
                onClick={comparisonMode ? handleComparisonTest : handleSingleTest}
                disabled={
                  testing || 
                  !testMessage.trim() || 
                  (!comparisonMode && !selectedAgent) ||
                  (comparisonMode && selectedAgentsForComparison.length < 2)
                }
                className="w-full"
              >
                {testing ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {comparisonMode ? 'Executar Comparação' : 'Executar Teste'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Mensagens Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mensagens de Teste Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testMessages.map((message, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full text-left justify-start text-xs h-auto py-2 px-3"
                    onClick={() => handleQuickTest(message)}
                  >
                    {message}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum teste executado ainda.<br />
                  Configure um teste e execute para ver os resultados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comparisonTests.map((comparison, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Comparação de Agentes</CardTitle>
                    <CardDescription>
                      Mensagem: "{comparison.message}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {comparison.results.map((result) => (
                        <div key={result.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{result.agentName}</h4>
                              <Badge variant="outline">{result.agentId}</Badge>
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatExecutionTime(result.executionTime)}
                              <Badge className={getConfidenceBadge(result.confidence)}>
                                {Math.round(result.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          {result.success ? (
                            <p className="text-sm">{result.response}</p>
                          ) : (
                            <Alert>
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                Erro: {result.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Resultados individuais */}
              <div className="space-y-2">
                {testResults
                  .filter(result => !comparisonTests.some(comp => 
                    comp.results.some(r => r.id === result.id)
                  ))
                  .map((result) => (
                    <Card key={result.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{result.agentName}</h4>
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatExecutionTime(result.executionTime)}
                            <Badge className={getConfidenceBadge(result.confidence)}>
                              {Math.round(result.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Pergunta: "{result.message}"
                        </p>
                        {result.success ? (
                          <p className="text-sm">{result.response}</p>
                        ) : (
                          <Alert>
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              Erro: {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}