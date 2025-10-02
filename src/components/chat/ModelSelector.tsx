import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { agentsService, Agent } from '@/services/agentsService';
interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
}

// Generate available models from the updated config
const AVAILABLE_MODELS = UPDATED_MODEL_CONFIGS.filter(config => config.available).map(config => ({
  value: `${config.provider}/${config.model}`,
  label: config.displayName,
  provider: config.provider.charAt(0).toUpperCase() + config.provider.slice(1),
  description: config.description
}));

// Group models by provider for better UX
const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, typeof AVAILABLE_MODELS>);
export function ModelSelector({
  selectedModel = 'anthropic/claude-3-5-sonnet-20241022',
  onModelSelect
}: ModelSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.value === selectedModel);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const activeAgents = await agentsService.getActiveAgents();
        setAgents(activeAgents);
      } catch (error) {
        console.error('Erro ao carregar agentes:', error);
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
  }, []);

  // Se temos agentes cadastrados, mostrar seletor de agentes
  if (!agentsLoading && agents.length > 0) {
    const defaultAgent = agents.find(agent => agent.is_default);
    const currentAgent = agents.find(agent => 
      selectedModel === agent.name || 
      (defaultAgent && selectedModel === 'default')
    ) || defaultAgent;

    return (
      <div className="space-y-2">
        <Label htmlFor="agent-select" className="text-sm font-medium">
          Sistema de IA ({agents.length} disponíveis)
        </Label>
        <Select 
          value={currentAgent?.name || agents[0]?.name} 
          onValueChange={(value) => onModelSelect?.(value)}
        >
          <SelectTrigger id="agent-select" className="w-full">
            <SelectValue placeholder="Selecione um agente" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.name}>
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{agent.display_name}</span>
                    {agent.is_default && (
                      <Badge variant="default" className="ml-2 text-xs">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  {agent.description && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {agent.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Agente selecionado: <span className="font-medium">{currentAgent?.display_name || 'Nenhum'}</span>
          {currentAgent?.provider && (
            <span className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">
              {currentAgent.provider}
            </span>
          )}
        </p>
      </div>
    );
  }

  // Fallback: Quando RAG v2 estiver ativo mas sem agentes cadastrados
  if (!loading && ragMode === 'dify') {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Sistema de IA
        </Label>
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
          <Badge variant="default" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            agentic-rag-v2
          </Badge>
        </div>
      </div>
    );
  }

  // Modo normal - mostrar seletor de modelos
  return <div className="space-y-2">
      <Label htmlFor="model-select" className="text-sm font-medium">
        Modelo de IA ({AVAILABLE_MODELS.length} disponíveis)
      </Label>
      <Select value={selectedModel} onValueChange={onModelSelect}>
        <SelectTrigger id="model-select" className="w-full">
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Object.entries(groupedModels).map(([provider, models]) => <div key={provider}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                {provider}
              </div>
              {models.map(model => <SelectItem key={model.value} value={model.value} className="pl-4">
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{model.label}</span>
                    </div>
                    {model.description && <span className="text-xs text-muted-foreground mt-1">
                        {model.description}
                      </span>}
                  </div>
                </SelectItem>)}
            </div>)}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Modelo selecionado: <span className="font-medium">{selectedModelInfo?.label || 'Claude 3.5 Sonnet'}</span>
        {selectedModelInfo?.provider && <span className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">
            {selectedModelInfo.provider}
          </span>}
      </p>
    </div>;
}