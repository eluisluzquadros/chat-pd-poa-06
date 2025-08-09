import { useState, useCallback } from 'react';

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3-5-sonnet-20241022');
  const [isLoading, setIsLoading] = useState(false);

  const switchModel = useCallback(async (modelString: string) => {
    setIsLoading(true);
    try {
      setSelectedModel(modelString);
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