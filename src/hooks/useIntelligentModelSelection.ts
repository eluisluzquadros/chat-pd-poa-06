import { useState, useEffect, useCallback } from 'react';
import { LLMProvider } from '@/types/chat';
import { llmMetricsService } from '@/services/llmMetricsService';

interface ModelSelectionCriteria {
  priority: 'speed' | 'quality' | 'cost' | 'balanced';
  hasImage?: boolean;
  queryLength?: number;
  queryComplexity?: 'simple' | 'medium' | 'complex';
  userRole?: string;
  budget?: number; // max cost per query
}

interface ModelRecommendation {
  provider: LLMProvider;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  qualityScore: number;
}

export function useIntelligentModelSelection() {
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMProvider>('openai');

  // Model characteristics for intelligent selection
  const modelCharacteristics = {
    'openai': { speed: 70, quality: 85, cost: 60, multimodal: false, complexity: 85 },
    'gpt-4.5': { speed: 60, quality: 95, cost: 30, multimodal: true, complexity: 95 },
    'claude': { speed: 65, quality: 90, cost: 50, multimodal: false, complexity: 90 },
    'claude-3-opus': { speed: 40, quality: 98, cost: 20, multimodal: false, complexity: 98 },
    'claude-3-sonnet': { speed: 75, quality: 85, cost: 70, multimodal: false, complexity: 85 },
    'claude-3-haiku': { speed: 95, quality: 75, cost: 90, multimodal: false, complexity: 75 },
    'gemini': { speed: 80, quality: 80, cost: 80, multimodal: false, complexity: 80 },
    'gemini-pro': { speed: 70, quality: 88, cost: 65, multimodal: true, complexity: 88 },
    'gemini-pro-vision': { speed: 60, quality: 85, cost: 60, multimodal: true, complexity: 85 },
    'llama': { speed: 50, quality: 70, cost: 100, multimodal: false, complexity: 70 },
    'deepseek': { speed: 75, quality: 78, cost: 95, multimodal: false, complexity: 82 },
    'groq': { speed: 98, quality: 75, cost: 85, multimodal: false, complexity: 75 },
  };

  const analyzeQueryComplexity = (query: string): 'simple' | 'medium' | 'complex' => {
    const length = query.length;
    const technicalTerms = ['ZOT', 'coeficiente', 'aproveitamento', 'gabarito', 'zoneamento', 'urbano'];
    const technicalCount = technicalTerms.filter(term => 
      query.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
    const hasComparisons = query.includes('vs') || query.includes('comparar') || query.includes('diferença');
    const hasCalculations = query.includes('calcul') || query.includes('quantos') || query.includes('média');

    if (length > 200 || technicalCount > 3 || hasComparisons || hasCalculations) {
      return 'complex';
    } else if (length > 100 || technicalCount > 1 || hasMultipleQuestions) {
      return 'medium';
    } else {
      return 'simple';
    }
  };

  const calculateModelScore = (
    provider: LLMProvider, 
    criteria: ModelSelectionCriteria
  ): { score: number; reasoning: string } => {
    const chars = modelCharacteristics[provider];
    let score = 0;
    let reasoningParts: string[] = [];

    // Priority-based scoring
    switch (criteria.priority) {
      case 'speed':
        score += chars.speed * 0.6;
        score += chars.quality * 0.2;
        score += chars.cost * 0.2;
        reasoningParts.push(`Otimizado para velocidade (${chars.speed}/100)`);
        break;
      case 'quality':
        score += chars.quality * 0.6;
        score += chars.complexity * 0.2;
        score += chars.speed * 0.1;
        score += chars.cost * 0.1;
        reasoningParts.push(`Foco na qualidade máxima (${chars.quality}/100)`);
        break;
      case 'cost':
        score += chars.cost * 0.6;
        score += chars.speed * 0.2;
        score += chars.quality * 0.2;
        reasoningParts.push(`Melhor custo-benefício (${chars.cost}/100)`);
        break;
      case 'balanced':
      default:
        score += (chars.speed + chars.quality + chars.cost + chars.complexity) / 4;
        reasoningParts.push('Equilíbrio entre todos os fatores');
        break;
    }

    // Image handling bonus
    if (criteria.hasImage && chars.multimodal) {
      score += 15;
      reasoningParts.push('Suporte multimodal (imagens)');
    } else if (criteria.hasImage && !chars.multimodal) {
      score -= 20;
      reasoningParts.push('Não suporta imagens');
    }

    // Complexity matching
    const complexityMap = { simple: 70, medium: 80, complex: 90 };
    const requiredComplexity = complexityMap[criteria.queryComplexity || 'medium'];
    if (chars.complexity >= requiredComplexity) {
      score += 10;
      reasoningParts.push(`Adequado para consultas ${criteria.queryComplexity}`);
    } else {
      score -= 5;
      reasoningParts.push(`Pode ter dificuldades com consultas ${criteria.queryComplexity}`);
    }

    // User role considerations
    if (criteria.userRole === 'admin' || criteria.userRole === 'analyst') {
      // Prefer quality for professional users
      score += chars.quality * 0.1;
      reasoningParts.push('Otimizado para uso profissional');
    } else if (criteria.userRole === 'citizen') {
      // Prefer speed and simplicity for citizens
      score += chars.speed * 0.1;
      reasoningParts.push('Otimizado para uso geral');
    }

    // Budget constraints
    const estimatedCost = llmMetricsService.getModelConfig(provider).costPerToken.output * 1000; // rough estimate
    if (criteria.budget && estimatedCost > criteria.budget) {
      score -= 30;
      reasoningParts.push('Excede orçamento definido');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      reasoning: reasoningParts.join(', ')
    };
  };

  const recommendModels = useCallback(async (criteria: ModelSelectionCriteria): Promise<ModelRecommendation[]> => {
    setLoading(true);
    
    try {
      const providers = llmMetricsService.getAllProviders();
      const recommendations: ModelRecommendation[] = [];

      for (const provider of providers) {
        const { score, reasoning } = calculateModelScore(provider, criteria);
        const config = llmMetricsService.getModelConfig(provider);
        
        // Get recent performance data
        const performances = await llmMetricsService.getModelPerformance(provider, 1);
        const performance = performances[0];

        recommendations.push({
          provider,
          confidence: score / 100,
          reasoning,
          estimatedCost: config.costPerToken.output * (criteria.queryLength || 500) / 4, // rough token estimate
          estimatedTime: performance?.averageResponseTime || 2000,
          qualityScore: performance?.averageQualityScore || score
        });
      }

      // Sort by confidence (score)
      const sorted = recommendations.sort((a, b) => b.confidence - a.confidence);
      setRecommendations(sorted);
      
      // Auto-select best model
      if (sorted.length > 0) {
        setSelectedModel(sorted[0].provider);
      }

      return sorted;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getBestModelFor = useCallback(async (
    query: string, 
    criteria?: Partial<ModelSelectionCriteria>
  ): Promise<LLMProvider> => {
    const fullCriteria: ModelSelectionCriteria = {
      priority: 'balanced',
      queryLength: query.length,
      queryComplexity: analyzeQueryComplexity(query),
      ...criteria
    };

    const recs = await recommendModels(fullCriteria);
    return recs.length > 0 ? recs[0].provider : 'openai';
  }, [recommendModels]);

  const getModelForSpeed = useCallback(async (): Promise<LLMProvider> => {
    const comparison = await llmMetricsService.compareModels();
    return comparison.bestForSpeed.provider;
  }, []);

  const getModelForQuality = useCallback(async (): Promise<LLMProvider> => {
    const comparison = await llmMetricsService.compareModels();
    return comparison.bestForQuality.provider;
  }, []);

  const getModelForCost = useCallback(async (): Promise<LLMProvider> => {
    const comparison = await llmMetricsService.compareModels();
    return comparison.bestForCost.provider;
  }, []);

  const switchToOptimalModel = useCallback(async (
    query: string,
    priority: 'speed' | 'quality' | 'cost' = 'balanced'
  ) => {
    let newModel: LLMProvider;
    
    switch (priority) {
      case 'speed':
        newModel = await getModelForSpeed();
        break;
      case 'quality':
        newModel = await getModelForQuality();
        break;
      case 'cost':
        newModel = await getModelForCost();
        break;
      default:
        newModel = await getBestModelFor(query, { priority: 'balanced' });
    }
    
    setSelectedModel(newModel);
    return newModel;
  }, [getBestModelFor, getModelForSpeed, getModelForQuality, getModelForCost]);

  return {
    selectedModel,
    setSelectedModel,
    recommendations,
    loading,
    recommendModels,
    getBestModelFor,
    getModelForSpeed,
    getModelForQuality,
    getModelForCost,
    switchToOptimalModel,
    analyzeQueryComplexity
  };
}