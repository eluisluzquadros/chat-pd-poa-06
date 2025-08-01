import { supabase } from "@/integrations/supabase/client";
import { LLMProvider, LLMMetrics } from "@/types/chat";
import { llmMetricsService } from "./llmMetricsService";

interface MultiLLMResponse {
  response: string;
  confidence: number;
  sources: { tabular: number; conceptual: number };
  executionTime: number;
  model: string;
  metrics?: LLMMetrics;
  provider: LLMProvider;
  qualityScore?: number;
  costEstimate?: number;
}

export class MultiLLMService {
  async processMessage(
    message: string,
    model: LLMProvider,
    userRole?: string,
    sessionId?: string
  ): Promise<MultiLLMResponse> {
    console.log(`🚀 Processing message with model: ${model}`);
    
    const requestData = {
      message,
      userRole,
      sessionId,
    };

    let functionName: string;
    let defaultResponse: MultiLLMResponse;

    // Route to appropriate edge function based on model
    const routingMap = this.getModelRouting();
    const modelInfo = routingMap[model] || routingMap["openai"];
    
    functionName = modelInfo.functionName;
    defaultResponse = {
      response: modelInfo.defaultMessage,
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: modelInfo.model,
      provider: model,
      qualityScore: 0,
      costEstimate: 0
    };

    try {
      const startTime = Date.now();
      
      console.log(`📤 Calling edge function: ${functionName}`, requestData);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          ...requestData,
          bypassCache: true // Force bypass cache to get fresh results
        },
      });

      const executionTime = Date.now() - startTime;

      console.log(`📥 Response from ${functionName}:`, { data, error, executionTime });

      if (error) {
        console.error(`Error calling ${functionName}:`, error);
        return { ...defaultResponse, executionTime };
      }

      // Calculate detailed metrics
      const success = !error && data?.response;
      const inputTokens = this.estimateTokens(message);
      const outputTokens = this.estimateTokens(data?.response || "");
      const qualityScore = this.calculateQualityScore(data, success);
      
      const metrics = await llmMetricsService.calculateMetrics(
        model,
        modelInfo.model,
        startTime,
        Date.now(),
        inputTokens,
        outputTokens,
        success,
        qualityScore
      );

      // Handle different response formats from different models
      return this.normalizeResponse(data, model, executionTime, metrics);
      
    } catch (error) {
      console.error(`Error in MultiLLMService for ${model}:`, error);
      return defaultResponse;
    }
  }

  private normalizeResponse(data: any, model: LLMProvider, executionTime: number, metrics?: LLMMetrics): MultiLLMResponse {
    // Normalize different response formats to a consistent structure
    const response = data?.response || data?.generatedText || data?.content || data?.text || "Resposta não disponível";
    const confidence = data?.confidence || 0.5;
    const sources = data?.sources || { tabular: 0, conceptual: 0 };
    const qualityScore = this.calculateQualityScore(data, !!response);
    const costEstimate = metrics?.totalCost || 0;

    return {
      response,
      confidence,
      sources,
      executionTime,
      model: metrics?.model || model,
      metrics,
      provider: model,
      qualityScore,
      costEstimate
    };
  }

  private getModelRouting(): Record<LLMProvider, { functionName: string; model: string; defaultMessage: string }> {
    return {
      "openai": {
        functionName: "agentic-rag",
        model: "gpt-4o-mini",
        defaultMessage: "Resposta do OpenAI indisponível. Tente novamente."
      },
      "gpt-4.5": {
        functionName: "openai-advanced-chat",  // New function for GPT-4.5
        model: "gpt-4.5-turbo",
        defaultMessage: "Resposta do GPT-4.5 indisponível. Tente novamente."
      },
      "claude": {
        functionName: "claude-chat",
        model: "claude-3-5-sonnet-20241022",
        defaultMessage: "Resposta do Claude indisponível. Tente novamente."
      },
      "claude-3-opus": {
        functionName: "claude-opus-chat",  // New function for Opus
        model: "claude-3-opus-20240229",
        defaultMessage: "Resposta do Claude 3 Opus indisponível. Tente novamente."
      },
      "claude-3-sonnet": {
        functionName: "claude-sonnet-chat",  // New function for Sonnet
        model: "claude-3-sonnet-20240229",
        defaultMessage: "Resposta do Claude 3 Sonnet indisponível. Tente novamente."
      },
      "claude-3-haiku": {
        functionName: "claude-haiku-chat",  // New function for Haiku
        model: "claude-3-haiku-20240307",
        defaultMessage: "Resposta do Claude 3 Haiku indisponível. Tente novamente."
      },
      "gemini": {
        functionName: "gemini-chat",
        model: "gemini-1.5-pro",
        defaultMessage: "Resposta do Gemini indisponível. Tente novamente."
      },
      "gemini-pro": {
        functionName: "gemini-pro-chat",  // New function for Gemini Pro
        model: "gemini-1.5-pro",
        defaultMessage: "Resposta do Gemini Pro indisponível. Tente novamente."
      },
      "gemini-pro-vision": {
        functionName: "gemini-vision-chat",  // New function for Gemini Vision
        model: "gemini-1.5-pro-vision",
        defaultMessage: "Resposta do Gemini Pro Vision indisponível. Tente novamente."
      },
      "llama": {
        functionName: "llama-chat",
        model: "llama-3.1-8b",
        defaultMessage: "Resposta do Llama indisponível. Tente novamente."
      },
      "deepseek": {
        functionName: "deepseek-chat",
        model: "deepseek-coder",
        defaultMessage: "Resposta do DeepSeek indisponível. Tente novamente."
      },
      "groq": {
        functionName: "groq-chat",
        model: "mixtral-8x7b-32768",
        defaultMessage: "Resposta do Groq indisponível. Tente novamente."
      }
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for most models
    return Math.ceil(text.length / 4);
  }

  private calculateQualityScore(data: any, success: boolean): number {
    if (!success) return 0;
    
    let score = 70; // Base score for successful response
    
    // Bonus for confidence
    if (data?.confidence > 0.8) score += 10;
    else if (data?.confidence > 0.6) score += 5;
    
    // Bonus for having sources
    if (data?.sources?.tabular > 0) score += 10;
    if (data?.sources?.conceptual > 0) score += 5;
    
    // Bonus for response length (indicates detail)
    const responseLength = (data?.response || "").length;
    if (responseLength > 500) score += 5;
    
    return Math.min(100, score);
  }

  async compareModels(message: string, userRole?: string): Promise<MultiLLMResponse[]> {
    const providers: LLMProvider[] = ["openai", "claude", "gemini", "groq"];
    const responses = await Promise.allSettled(
      providers.map(provider => 
        this.processMessage(message, provider, userRole)
      )
    );

    return responses
      .filter((result): result is PromiseFulfilledResult<MultiLLMResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  async getBestModel(message: string, criteria: 'speed' | 'quality' | 'cost' = 'quality'): Promise<LLMProvider> {
    const comparison = await llmMetricsService.compareModels();
    
    switch (criteria) {
      case 'speed':
        return comparison.bestForSpeed.provider;
      case 'cost':
        return comparison.bestForCost.provider;
      case 'quality':
      default:
        return comparison.bestForQuality.provider;
    }
  }
}

export const multiLLMService = new MultiLLMService();

// Export metrics service for external use
export { llmMetricsService } from './llmMetricsService';