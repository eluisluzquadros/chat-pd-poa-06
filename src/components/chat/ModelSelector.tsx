import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LLMProvider } from "@/types/chat";
import { ChevronDown } from "lucide-react";
import { MODEL_CONFIGS } from "@/services/benchmarkService";

interface ModelSelectorProps {
  selectedModel: LLMProvider;
  onModelSelect: (model: LLMProvider) => void;
}

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  // Agrupar modelos por provider
  const modelsByProvider = MODEL_CONFIGS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof MODEL_CONFIGS>);

  // Encontrar o modelo selecionado
  const selectedModelConfig = MODEL_CONFIGS.find(m => {
    const modelId = `${m.provider}/${m.model}`;
    return modelId === selectedModel || m.model === selectedModel;
  });

  const providerLabels = {
    openai: "🟢 OpenAI",
    anthropic: "🔵 Anthropic",
    google: "🔴 Google",
    deepseek: "🟣 DeepSeek",
    zhipuai: "🟡 ZhipuAI"
  };

  const handleModelSelect = (model: typeof MODEL_CONFIGS[0]) => {
    const modelId = `${model.provider}/${model.model}`;
    onModelSelect(modelId as LLMProvider);
    
    // Salvar a seleção no localStorage para persistência
    localStorage.setItem('preferredModel', modelId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[280px] justify-between">
          {selectedModelConfig ? (
            <span className="flex items-center gap-2">
              <span>{providerLabels[selectedModelConfig.provider]?.split(' ')[0]}</span>
              <span>{selectedModelConfig.model}</span>
            </span>
          ) : (
            "Selecione um modelo"
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] max-h-[400px] overflow-y-auto">
        {Object.entries(modelsByProvider).map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel>{providerLabels[provider as keyof typeof providerLabels]}</DropdownMenuLabel>
            {models.map((model) => {
              const modelId = `${model.provider}/${model.model}`;
              const isSelected = modelId === selectedModel || 
                                (selectedModelConfig?.provider === model.provider && 
                                 selectedModelConfig?.model === model.model);
              
              return (
                <DropdownMenuItem
                  key={modelId}
                  onClick={() => handleModelSelect(model)}
                  className={isSelected ? "bg-accent" : ""}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{model.model}</span>
                    <span className="text-xs text-muted-foreground">
                      ${(model.costPerInputToken * 1000).toFixed(4)}/1K tokens
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="last:hidden" />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}