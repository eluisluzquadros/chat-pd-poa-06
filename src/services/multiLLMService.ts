import { supabase } from "@/integrations/supabase/client";
import { llmMetricsService } from "./llmMetricsService";

export interface MultiLLMResponse {
  response: string;
  confidence: number;
  sources: { tabular: number; conceptual: number };
  executionTime: number;
  model?: string;
  metrics?: any;
  provider?: string;
  qualityScore?: number;
  costEstimate?: number;
}

export class MultiLLMService {
  async processMessage(
    message: string,
    model: string = "openai/gpt-3.5-turbo",
    userRole?: string,
    sessionId?: string
  ): Promise<MultiLLMResponse> {
    console.log("🎯 MultiLLMService.processMessage called with:", {
      message,
      model,
      userRole,
      sessionId
    });
    
    let provider: string;
    let modelName: string;
    
    if (model.includes('/')) {
      [provider, modelName] = model.split('/');
    } else {
      // Fallback para formato antigo
      provider = model;
      modelName = this.getDefaultModelForProvider(provider);
    }
    
    const requestData = {
      message,
      model: model, // Passar o modelo completo
      userRole,
      sessionId,
    };

    let functionName: string;
    let defaultResponse: MultiLLMResponse;

    // Todas as requisições vão para agentic-rag que suporta múltiplos modelos
    functionName = "agentic-rag";
    
    defaultResponse = {
      response: `Desculpe, ocorreu um erro ao processar sua solicitação com ${provider}. Por favor, tente novamente ou selecione outro modelo.`,
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: modelName,
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

      console.log(`📥 Response from ${functionName}:`, { 
        data, 
        error, 
        executionTime,
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message || 'no error'
      });

      if (error) {
        console.error(`❌ Error calling ${functionName}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { ...defaultResponse, executionTime };
      }

      if (!data) {
        console.error(`❌ No data returned from ${functionName}`);
        return { ...defaultResponse, executionTime };
      }

      // Calculate detailed metrics
      const success = !error && data?.response;
      const inputTokens = this.estimateTokens(message);
      const outputTokens = this.estimateTokens(data?.response || "");
      const qualityScore = this.calculateQualityScore(data, success);
      
      const metrics = await llmMetricsService.calculateMetrics(
        model,
        modelName,
        startTime,
        Date.now(),
        inputTokens,
        outputTokens,
        success,
        qualityScore
      );

      const { response, confidence = 0.5, sources = { tabular: 0, conceptual: 0 } } = data;
      
      // Store metrics
      await llmMetricsService.storeMetrics(
        model,
        metrics,
        {
          sessionId,
          userRole,
          messageLength: message.length,
          responseLength: response?.length || 0
        }
      );

      const result: MultiLLMResponse = {
        response: response || defaultResponse.response,
        confidence,
        sources,
        executionTime,
        model: metrics?.model || model,
        metrics,
        provider: model,
        qualityScore,
        costEstimate: metrics?.costEstimate || 0
      };

      console.log("✅ MultiLLMService result:", result);
      return result;

    } catch (error) {
      console.error("❌ MultiLLMService error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      
      // Return default response instead of throwing
      return {
        ...defaultResponse,
        executionTime: Date.now() - Date.now(),
        response: error instanceof Error ? 
          `Erro ao processar mensagem: ${error.message}` : 
          defaultResponse.response
      };
    }
  }
  
  private getDefaultModelForProvider(provider: string): string {
    const defaults: Record<string, string> = {
      "openai": "gpt-3.5-turbo",
      "anthropic": "claude-3-5-sonnet-20241022",
      "google": "gemini-1.5-flash",
      "deepseek": "deepseek-chat",
      "zhipuai": "glm-4"
    };
    return defaults[provider] || "gpt-3.5-turbo";
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  private calculateQualityScore(data: any, success: boolean): number {
    if (!success) return 0;
    
    let score = 0.5; // Base score
    
    // Add points for confidence
    if (data?.confidence) {
      score += data.confidence * 0.3;
    }
    
    // Add points for having sources
    if (data?.sources) {
      const totalSources = (data.sources.tabular || 0) + (data.sources.conceptual || 0);
      score += Math.min(totalSources * 0.1, 0.2);
    }
    
    return Math.min(score, 1);
  }
}

export const multiLLMService = new MultiLLMService();