import { useState, useCallback } from 'react';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'zhipuai';

export interface ModelConfig {
  name: string;
  provider: LLMProvider;
  displayName: string;
  description: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
  };
}

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<LLMProvider>('openai');
  const [isLoading, setIsLoading] = useState(false);

  const switchModel = useCallback(async (provider: LLMProvider) => {
    setIsLoading(true);
    try {
      setSelectedModel(provider);
    } catch (error) {
      console.error('Error switching model:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    selectedModel,
    isLoading,
    switchModel
  };
}