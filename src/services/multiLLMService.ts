import { supabase } from "@/integrations/supabase/client";
import { LLMProvider } from "@/types/chat";

interface MultiLLMResponse {
  response: string;
  confidence: number;
  sources: { tabular: number; conceptual: number };
  executionTime: number;
  model: string;
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
    switch (model) {
      case "claude":
        functionName = "claude-chat";
        defaultResponse = {
          response: "Resposta do Claude indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "claude"
        };
        break;
        
      case "gemini":
        functionName = "gemini-chat";
        defaultResponse = {
          response: "Resposta do Gemini indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "gemini"
        };
        break;
        
      case "llama":
        functionName = "llama-chat";
        defaultResponse = {
          response: "Resposta do Llama indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "llama"
        };
        break;
        
      case "deepseek":
        functionName = "deepseek-chat";
        defaultResponse = {
          response: "Resposta do DeepSeek indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "deepseek"
        };
        break;
        
      case "qwen":
        functionName = "qwen-chat";
        defaultResponse = {
          response: "Resposta do Qwen indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "qwen"
        };
        break;
        
      case "openai":
      default:
        // Use agentic-rag for OpenAI as it's the most sophisticated
        functionName = "agentic-rag";
        defaultResponse = {
          response: "Resposta indisponível. Tente novamente.",
          confidence: 0,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 0,
          model: "openai"
        };
        break;
    }

    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestData,
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        console.error(`Error calling ${functionName}:`, error);
        return { ...defaultResponse, executionTime };
      }

      // Handle different response formats from different models
      return this.normalizeResponse(data, model, executionTime);
      
    } catch (error) {
      console.error(`Error in MultiLLMService for ${model}:`, error);
      return defaultResponse;
    }
  }

  private normalizeResponse(data: any, model: LLMProvider, executionTime: number): MultiLLMResponse {
    // Normalize different response formats to a consistent structure
    const response = data?.response || data?.generatedText || data?.content || data?.text || "Resposta não disponível";
    const confidence = data?.confidence || 0.5;
    const sources = data?.sources || { tabular: 0, conceptual: 0 };

    return {
      response,
      confidence,
      sources,
      executionTime,
      model
    };
  }
}

export const multiLLMService = new MultiLLMService();