import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
}

// Generate available models from the updated config
const AVAILABLE_MODELS = UPDATED_MODEL_CONFIGS
  .filter(config => config.available)
  .map(config => ({
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

export function ModelSelector({ selectedModel = 'anthropic/claude-3-5-sonnet-20241022', onModelSelect }: ModelSelectorProps) {
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.value === selectedModel);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="model-select" className="text-sm font-medium">
        Modelo de IA ({AVAILABLE_MODELS.length} disponíveis)
      </Label>
      <Select value={selectedModel} onValueChange={onModelSelect}>
        <SelectTrigger id="model-select" className="w-full">
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                {provider}
              </div>
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value} className="pl-4">
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{model.label}</span>
                    </div>
                    {model.description && (
                      <span className="text-xs text-muted-foreground mt-1">
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
      <p className="text-xs text-muted-foreground">
        Modelo selecionado: <span className="font-medium">{selectedModelInfo?.label || 'Claude 3.5 Sonnet'}</span>
        {selectedModelInfo?.provider && (
          <span className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">
            {selectedModelInfo.provider}
          </span>
        )}
      </p>
    </div>
  );
}