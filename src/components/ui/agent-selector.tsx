import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAgents } from '@/hooks/useAgents';
import { Cpu, Loader2 } from 'lucide-react';

interface AgentSelectorProps {
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
  label?: string;
  showDetails?: boolean;
}

export function AgentSelector({ 
  selectedAgent, 
  onAgentChange, 
  label = "Agente",
  showDetails = true 
}: AgentSelectorProps) {
  const { agents, loading } = useAgents();
  
  const activeAgents = agents.filter(agent => agent.is_active);
  const selectedAgentData = activeAgents.find(agent => agent.id === selectedAgent);

  if (loading) {
    return (
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          {label}
        </Label>
        <div className="flex items-center gap-2 p-3 rounded-md border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Cpu className="h-4 w-4" />
        {label}
      </Label>
      
      <Select value={selectedAgent} onValueChange={onAgentChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um agente">
            {selectedAgentData ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedAgentData.provider}
                </Badge>
                {selectedAgentData.display_name}
                {selectedAgentData.is_default && (
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                )}
              </div>
            ) : (
              "Selecione um agente"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {activeAgents.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhum agente ativo encontrado
            </div>
          ) : (
            activeAgents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {agent.provider}
                    </Badge>
                    <span>{agent.display_name}</span>
                    {agent.is_default && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {showDetails && selectedAgentData && (
        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{selectedAgentData.display_name}</h4>
            <div className="flex gap-1">
              <Badge variant="outline" className="capitalize">
                {selectedAgentData.provider}
              </Badge>
              {selectedAgentData.is_default && (
                <Badge variant="secondary">Padrão</Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-medium">Modelo:</span>
              <span className="text-muted-foreground">{selectedAgentData.model}</span>
            </div>
            {selectedAgentData.description && (
              <div className="flex items-start gap-1">
                <span className="font-medium">Descrição:</span>
                <span className="text-muted-foreground">{selectedAgentData.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}