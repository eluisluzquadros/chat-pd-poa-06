import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
}

const AVAILABLE_MODELS = [
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'openai/gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic' },
  { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { value: 'google/gemini-flash', label: 'Gemini Flash', provider: 'Google' },
  { value: 'google/gemini-pro', label: 'Gemini Pro', provider: 'Google' },
];

export function ModelSelector({ selectedModel = 'openai/gpt-3.5-turbo', onModelSelect }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="model-select" className="text-sm font-medium">
        Modelo de IA
      </Label>
      <Select value={selectedModel} onValueChange={onModelSelect}>
        <SelectTrigger id="model-select" className="w-full">
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_MODELS.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              <div className="flex items-center justify-between w-full">
                <span>{model.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {model.provider}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Modelo selecionado: {AVAILABLE_MODELS.find(m => m.value === selectedModel)?.label || 'GPT-3.5 Turbo'}
      </p>
    </div>
  );
}