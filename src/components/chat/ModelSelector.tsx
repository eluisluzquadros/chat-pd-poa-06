import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LLMProvider } from "@/types/chat";
import { ChevronDown } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: LLMProvider;
  onModelSelect: (model: LLMProvider) => void;
}

// Modelos alinhados com o sistema de benchmark e edge functions
const models: { id: string; name: string; provider: LLMProvider }[] = [
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "claude" },
  { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", provider: "claude" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "claude" },
  { id: "google/gemini-pro", name: "Gemini Pro", provider: "gemini" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
  { id: "groq/llama3-70b", name: "Llama 3 70B (Groq)", provider: "groq" },
];

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  // Encontrar o modelo selecionado baseado no provider
  const selectedModelConfig = models.find(m => {
    // Se selectedModel é apenas o provider (ex: "openai"), pegar o primeiro modelo desse provider
    if (!selectedModel.includes('/')) {
      return m.provider === selectedModel;
    }
    // Se já é um modelo completo (ex: "openai/gpt-3.5-turbo"), comparar diretamente
    return m.id === selectedModel;
  });

  const handleModelSelect = (modelId: string) => {
    // Passar o ID completo do modelo (provider/model) para o onModelSelect
    onModelSelect(modelId as LLMProvider);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[220px] justify-between">
          {selectedModelConfig?.name || "Selecione um modelo"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={selectedModelConfig?.id === model.id ? "bg-accent" : ""}
          >
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}