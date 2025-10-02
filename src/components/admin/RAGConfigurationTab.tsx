import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Settings, TestTube, Loader2, Bot, Target, Settings2 } from "lucide-react";
import { useRAGConfig } from "@/hooks/useRAGConfig";
import { useAgents } from "@/hooks/useAgents";
import { useState, useEffect } from "react";
import { agentsService } from "@/services/agentsService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const RAGConfigurationTab = () => {
  const { status, loading, updating, switchRAGMode, testConfiguration } = useRAGConfig();
  const { agents, loading: agentsLoading } = useAgents();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Estados para seleção de agente default
  const [defaultAgent, setDefaultAgent] = useState<string>('');
  const [updatingDefaultAgent, setUpdatingDefaultAgent] = useState(false);
  
  // Carregar agente default atual
  useEffect(() => {
    const loadDefaultAgent = async () => {
      try {
        const agent = await agentsService.getDefaultAgent();
        if (agent) {
          setDefaultAgent(agent.id);
        }
      } catch (error) {
        console.error('Erro ao carregar agente default:', error);
      }
    };
    
    if (!agentsLoading) {
      loadDefaultAgent();
    }
  }, [agentsLoading]);
  
  // Função para atualizar agente default
  const handleDefaultAgentChange = async (agentId: string) => {
    setUpdatingDefaultAgent(true);
    try {
      await agentsService.setDefaultAgent(agentId);
      setDefaultAgent(agentId);
      
      // Invalidar cache de agentes para refletir mudança do badge "Padrão"
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      const selectedAgent = agents.find(a => a.id === agentId);
      toast.success(`Agente padrão atualizado para: ${selectedAgent?.display_name}`);
    } catch (error) {
      console.error('Erro ao atualizar agente default:', error);
      toast.error('Erro ao atualizar agente padrão');
    } finally {
      setUpdatingDefaultAgent(false);
    }
  };
  
  // Filtrar apenas agentes ativos
  const activeAgents = agents.filter(agent => agent.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Carregando configuração...</span>
      </div>
    );
  }

  const StatusIndicator = ({ isActive, label }: { isActive: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {isActive ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span className={isActive ? "text-green-700 font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Sistema RAG
          </CardTitle>
          <CardDescription>
            Gerencie o modo de operação do sistema de Recuperação de Informações (RAG)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Atual */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Status Atual</h4>
            <div className="flex items-center gap-4">
              <Badge variant={status.isConfigured ? "default" : "destructive"}>
                {status.isConfigured ? "Configurado" : "Não Configurado"}
              </Badge>
              <Badge variant="outline">
                {status.currentMode === 'dify' ? 'Rag-v2' : 'Rag-v1'} Ativo
              </Badge>
            </div>
            
            {!status.isConfigured && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Configuração Incompleta</p>
                  <p>Para usar o agentic-rag-v2, configure os secrets necessários.</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Toggle de Modo */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Modo de Operação</h4>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <StatusIndicator 
                  isActive={status.currentMode === 'local'} 
                  label="agentic-rag-v1" 
                />
                <p className="text-sm text-muted-foreground ml-6">
                  Sistema RAG interno via edge functions Supabase
                </p>
              </div>
              
              <Switch
                checked={status.currentMode === 'dify'}
                onCheckedChange={(checked) => 
                  switchRAGMode(checked ? 'dify' : 'local')
                }
                disabled={updating}
              />
              
              <div className="space-y-1">
                <StatusIndicator 
                  isActive={status.currentMode === 'dify'} 
                  label="agentic-rag-v2" 
                />
                <p className="text-sm text-muted-foreground mr-6">
                  Sistema RAG avançado (versão 2)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações dos Modos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={status.currentMode === 'local' ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">agentic-rag-v1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sempre disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Edge functions nativas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sistema integrado</span>
                </div>
              </CardContent>
            </Card>

            <Card className={status.currentMode === 'dify' ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">agentic-rag-v2</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.difySecretsAvailable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    Secrets {status.difySecretsAvailable ? 'configurados' : 'pendentes'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Processamento otimizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Interface visual</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Teste de Configuração */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Teste de Configuração</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">Testar configuração atual</p>
                {status.lastTested && (
                  <p className="text-xs text-muted-foreground">
                    Último teste: {status.lastTested.toLocaleString()}
                    {status.testResult && (
                      <Badge 
                        variant={status.testResult === 'success' ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {status.testResult === 'success' ? 'Sucesso' : 'Erro'}
                      </Badge>
                    )}
                  </p>
                )}
                {status.testMessage && (
                  <p className="text-xs text-muted-foreground">{status.testMessage}</p>
                )}
              </div>
              
              <Button
                onClick={testConfiguration}
                disabled={updating || !status.isConfigured}
                variant="outline"
                size="sm"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Agente Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agente Padrão da Plataforma
          </CardTitle>
          <CardDescription>
            Selecione qual agente externo será usado como padrão para todos os usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-agent">Agente Padrão</Label>
            {agentsLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando agentes...</span>
              </div>
            ) : (
              <Select 
                value={defaultAgent} 
                onValueChange={handleDefaultAgentChange}
                disabled={updatingDefaultAgent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o agente padrão" />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span>{agent.display_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {agent.provider}
                        </Badge>
                        {agent.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {defaultAgent && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Agente Configurado</p>
                  <p>
                    Este agente será usado automaticamente para novos usuários e como fallback
                    quando nenhum agente específico for selecionado.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {updatingDefaultAgent && (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Atualizando agente padrão...</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            <p>
              💡 <strong>Dica:</strong> O agente padrão é usado quando usuários não especificam
              um agente preferido ou quando o sistema precisa fazer fallback.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RAGConfigurationTab;