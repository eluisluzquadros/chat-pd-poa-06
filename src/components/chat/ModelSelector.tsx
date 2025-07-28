
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

const models: { id: LLMProvider; name: string }[] = [
  { id: "openai", name: "OpenAI GPT-4" },
  { id: "claude", name: "Anthropic Claude" },
  { id: "gemini", name: "Google Gemini" },
  { id: "llama", name: "Meta Llama" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "groq", name: "Groq" },
];

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const selectedModelName = models.find((m) => m.id === selectedModel)?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {selectedModelName}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelSelect(model.id)}
          >
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
