import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';

interface QAModelSelectorProps {
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
  label?: string;
  showCosts?: boolean;
}

// Generate available models from the updated config
const AVAILABLE_MODELS = UPDATED_MODEL_CONFIGS
  .filter(config => config.available)
  .map(config => ({
    value: `${config.provider}/${config.model}`,
    label: config.displayName,
    provider: config.provider.charAt(0).toUpperCase() + config.provider.slice(1),
    description: config.description,
    costPerInputToken: config.costPerInputToken,
    costPerOutputToken: config.costPerOutputToken,
    averageLatency: config.averageLatency
  }));

// Group models by provider for better UX
const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, typeof AVAILABLE_MODELS>);

const getCostBadgeVariant = (inputCost: number) => {
  if (inputCost < 0.001) return 'default'; // Low cost
  if (inputCost < 0.01) return 'secondary'; // Medium cost
  return 'destructive'; // High cost
};

const getLatencyBadgeVariant = (latency: number) => {
  if (latency < 2000) return 'default'; // Fast
  if (latency < 4000) return 'secondary'; // Medium
  return 'destructive'; // Slow
};

export function QAModelSelector({ 
  selectedModel = 'anthropic/claude-3-5-sonnet-20241022', 
  onModelSelect,
  label = 'Modelo para Validação QA',
  showCosts = true
}: QAModelSelectorProps) {
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.value === selectedModel);
  
  return (
    <div className="space-y-3">
      <Label htmlFor="qa-model-select" className="text-sm font-medium">
        {label} ({AVAILABLE_MODELS.length} disponíveis)
      </Label>
      <Select value={selectedModel} onValueChange={onModelSelect}>
        <SelectTrigger id="qa-model-select" className="w-full">
          <SelectValue placeholder="Selecione um modelo para testes" />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                {provider} ({models.length} modelos)
              </div>
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value} className="pl-4">
                  <div className="flex flex-col w-full space-y-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{model.label}</span>
                      <div className="flex gap-1">
                        {showCosts && (
                          <>
                            <Badge 
                              variant={getCostBadgeVariant(model.costPerInputToken)}
                              className="text-xs"
                            >
                              ${(model.costPerInputToken * 1000).toFixed(3)}/1K
                            </Badge>
                            <Badge 
                              variant={getLatencyBadgeVariant(model.averageLatency)}
                              className="text-xs"
                            >
                              {model.averageLatency}ms
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    {model.description && (
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      
      {selectedModelInfo && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{selectedModelInfo.label}</span>
              <span className="text-xs text-muted-foreground">{selectedModelInfo.provider}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant={getCostBadgeVariant(selectedModelInfo.costPerInputToken)}>
                ${(selectedModelInfo.costPerInputToken * 1000).toFixed(3)}/1K tokens
              </Badge>
              <Badge variant={getLatencyBadgeVariant(selectedModelInfo.averageLatency)}>
                ~{selectedModelInfo.averageLatency}ms
              </Badge>
            </div>
          </div>
          {selectedModelInfo.description && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedModelInfo.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}