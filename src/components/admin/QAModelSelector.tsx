import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { Cpu, Zap, Clock, DollarSign } from 'lucide-react';

interface QAModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  label?: string;
  showDetails?: boolean;
}

export function QAModelSelector({ 
  selectedModel, 
  onModelChange, 
  label = "Modelo LLM",
  showDetails = true 
}: QAModelSelectorProps) {
  const selectedConfig = UPDATED_MODEL_CONFIGS.find(config => config.model === selectedModel);

  const groupedModels = UPDATED_MODEL_CONFIGS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof UPDATED_MODEL_CONFIGS>);

  const formatCost = (cost: number) => {
    if (cost >= 0.01) {
      return `$${cost.toFixed(3)}`;
    }
    return `$${(cost * 1000).toFixed(2)}k`;
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Cpu className="h-4 w-4" />
        {label}
      </Label>
      
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um modelo">
            {selectedConfig ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedConfig.provider}
                </Badge>
                {selectedConfig.displayName}
              </div>
            ) : (
              "Selecione um modelo"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground capitalize bg-muted/50">
                {provider}
              </div>
              {models.map(model => (
                <SelectItem key={model.model} value={model.model}>
                  <div className="flex items-center justify-between w-full">
                    <span>{model.displayName}</span>
                    <div className="flex gap-2 ml-4">
                      <Badge variant="secondary" className="text-xs">
                        {formatLatency(model.averageLatency)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatCost(model.costPerInputToken)}/1K
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {showDetails && selectedConfig && (
        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{selectedConfig.displayName}</h4>
            <Badge variant="outline" className="capitalize">
              {selectedConfig.provider}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Latência: {formatLatency(selectedConfig.averageLatency)}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span>Input: {formatCost(selectedConfig.costPerInputToken)}/1K</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span>Max Tokens: {selectedConfig.maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span>Output: {formatCost(selectedConfig.costPerOutputToken)}/1K</span>
            </div>
          </div>

          {selectedConfig.description && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedConfig.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}