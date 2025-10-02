import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Bot, Target } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { useState, useEffect } from "react";
import { agentsService } from "@/services/agentsService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const RAGConfigurationTab = () => {
  const { agents, loading: agentsLoading } = useAgents();
  const queryClient = useQueryClient();
  
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

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Carregando agentes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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