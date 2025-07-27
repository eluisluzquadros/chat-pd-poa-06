import { useState, useCallback } from "react";
import { LLMProvider } from "@/types/chat";

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<LLMProvider>("openai");

  const handleModelSelect = useCallback((model: LLMProvider) => {
    setSelectedModel(model);
  }, []);

  return {
    selectedModel,
    handleModelSelect,
  };
}