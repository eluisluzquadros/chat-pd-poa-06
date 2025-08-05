import { useState, useCallback, useEffect } from "react";
import { LLMProvider } from "@/types/chat";

export function useModelSelection() {
  // Recuperar modelo preferido do localStorage ou usar padrão
  const getInitialModel = (): LLMProvider => {
    try {
      const savedModel = localStorage.getItem('preferredModel');
      if (savedModel) {
        return savedModel as LLMProvider;
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
    return "openai/gpt-3.5-turbo";
  };

  const [selectedModel, setSelectedModel] = useState<LLMProvider>(getInitialModel);

  const handleModelSelect = useCallback((model: LLMProvider) => {
    setSelectedModel(model);
    // Salvar no localStorage para persistência
    try {
      localStorage.setItem('preferredModel', model);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, []);

  // Sincronizar com mudanças no localStorage (útil se múltiplas abas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredModel' && e.newValue) {
        setSelectedModel(e.newValue as LLMProvider);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    selectedModel,
    handleModelSelect,
  };
}