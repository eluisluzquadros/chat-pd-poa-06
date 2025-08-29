import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type OptimizationGoal = 'speed' | 'cost' | 'quality';

export interface ModelRecommendation {
  model: string;
  provider: string;
  reason: string;
  confidence: number;
}

export function useIntelligentModelSelection() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);

  const getModelRecommendation = useCallback(async (
    query: string,
    goal: OptimizationGoal = 'quality'
  ) => {
    setIsLoading(true);
    try {
      // Simulate intelligent model selection
      const mockRecommendation: ModelRecommendation = {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        reason: `Modelo otimizado para ${goal}`,
        confidence: 0.85
      };
      
      setRecommendation(mockRecommendation);
      return mockRecommendation;
    } catch (error) {
      console.error('Error getting model recommendation:', error);
      toast.error('Erro ao obter recomendação de modelo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    recommendation,
    getModelRecommendation
  };
}