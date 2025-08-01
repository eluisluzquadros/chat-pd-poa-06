import { LLMProvider, LLMMetrics, ModelPerformance, LLMComparison } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";

interface ModelConfig {
  provider: LLMProvider;
  models: string[];
  costPerToken: {
    input: number;
    output: number;
  };
  maxTokensPerSecond: number;
  apiEndpoint: string;
  headers: Record<string, string>;
}

export class LLMMetricsService {
  private static instance: LLMMetricsService;
  private modelConfigs: Record<LLMProvider, ModelConfig> = {
    "openai": {
      provider: "openai",
      models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
      costPerToken: { input: 0.0000025, output: 0.00001 },
      maxTokensPerSecond: 50,
      apiEndpoint: "https://api.openai.com/v1/chat/completions",
      headers: { "Authorization": "Bearer ", "Content-Type": "application/json" }
    },
    "gpt-4.5": {
      provider: "gpt-4.5",
      models: ["gpt-4.5-turbo", "gpt-4.5"],
      costPerToken: { input: 0.000005, output: 0.000015 },
      maxTokensPerSecond: 40,
      apiEndpoint: "https://api.openai.com/v1/chat/completions",
      headers: { "Authorization": "Bearer ", "Content-Type": "application/json" }
    },
    "claude": {
      provider: "claude",
      models: ["claude-3-5-sonnet-20241022"],
      costPerToken: { input: 0.000003, output: 0.000015 },
      maxTokensPerSecond: 45,
      apiEndpoint: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": "", "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
    },
    "claude-3-opus": {
      provider: "claude-3-opus",
      models: ["claude-3-opus-20240229"],
      costPerToken: { input: 0.000015, output: 0.000075 },
      maxTokensPerSecond: 30,
      apiEndpoint: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": "", "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
    },
    "claude-3-sonnet": {
      provider: "claude-3-sonnet",
      models: ["claude-3-sonnet-20240229"],
      costPerToken: { input: 0.000003, output: 0.000015 },
      maxTokensPerSecond: 40,
      apiEndpoint: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": "", "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
    },
    "claude-3-haiku": {
      provider: "claude-3-haiku",
      models: ["claude-3-haiku-20240307"],
      costPerToken: { input: 0.00000025, output: 0.00000125 },
      maxTokensPerSecond: 60,
      apiEndpoint: "https://api.anthropic.com/v1/messages", 
      headers: { "x-api-key": "", "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
    },
    "gemini": {
      provider: "gemini",
      models: ["gemini-1.5-pro", "gemini-1.5-flash"],
      costPerToken: { input: 0.00000125, output: 0.000005 },
      maxTokensPerSecond: 50,
      apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
      headers: { "Content-Type": "application/json" }
    },
    "gemini-pro": {
      provider: "gemini-pro",
      models: ["gemini-1.5-pro"],
      costPerToken: { input: 0.00000125, output: 0.000005 },
      maxTokensPerSecond: 45,
      apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
      headers: { "Content-Type": "application/json" }
    },
    "gemini-pro-vision": {
      provider: "gemini-pro-vision",
      models: ["gemini-1.5-pro-vision"],
      costPerToken: { input: 0.00000125, output: 0.000005 },
      maxTokensPerSecond: 35,
      apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
      headers: { "Content-Type": "application/json" }
    },
    "llama": {
      provider: "llama",
      models: ["llama-3.1-8b", "llama-3.1-70b"],
      costPerToken: { input: 0.0000002, output: 0.0000008 },
      maxTokensPerSecond: 70,
      apiEndpoint: "http://localhost:11434/api/chat",
      headers: { "Content-Type": "application/json" }
    },
    "deepseek": {
      provider: "deepseek",
      models: ["deepseek-coder", "deepseek-chat"],
      costPerToken: { input: 0.00000014, output: 0.00000028 },
      maxTokensPerSecond: 65,
      apiEndpoint: "https://api.deepseek.com/v1/chat/completions",
      headers: { "Authorization": "Bearer ", "Content-Type": "application/json" }
    },
    "groq": {
      provider: "groq",
      models: ["mixtral-8x7b-32768", "llama-3.1-8b-instant"],
      costPerToken: { input: 0.00000027, output: 0.00000027 },
      maxTokensPerSecond: 100,
      apiEndpoint: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "Authorization": "Bearer ", "Content-Type": "application/json" }
    }
  };

  public static getInstance(): LLMMetricsService {
    if (!LLMMetricsService.instance) {
      LLMMetricsService.instance = new LLMMetricsService();
    }
    return LLMMetricsService.instance;
  }

  async calculateMetrics(
    provider: LLMProvider,
    model: string,
    startTime: number,
    endTime: number,
    inputTokens: number,
    outputTokens: number,
    success: boolean,
    qualityScore?: number
  ): Promise<LLMMetrics> {
    const responseTime = endTime - startTime;
    const totalTokens = inputTokens + outputTokens;
    const tokensPerSecond = totalTokens / (responseTime / 1000);
    
    const config = this.modelConfigs[provider];
    const totalCost = (inputTokens * config.costPerToken.input) + (outputTokens * config.costPerToken.output);
    
    const metrics: LLMMetrics = {
      responseTime,
      tokensPerSecond,
      inputTokens,
      outputTokens,
      totalTokens,
      costPerToken: config.costPerToken.input,
      totalCost,
      qualityScore: qualityScore || (success ? 85 : 0),
      confidence: success ? 0.9 : 0.1,
      successRate: success ? 100 : 0,
      model,
      provider
    };

    // Store metrics in database
    await this.storeMetrics(metrics);
    return metrics;
  }

  private async storeMetrics(metrics: LLMMetrics): Promise<void> {
    try {
      const { error } = await supabase.from('llm_metrics').insert({
        provider: metrics.provider,
        model: metrics.model,
        response_time: metrics.responseTime,
        tokens_per_second: metrics.tokensPerSecond,
        input_tokens: metrics.inputTokens,
        output_tokens: metrics.outputTokens,
        total_tokens: metrics.totalTokens,
        cost_per_token: metrics.costPerToken,
        total_cost: metrics.totalCost,
        quality_score: metrics.qualityScore,
        confidence: metrics.confidence,
        success_rate: metrics.successRate,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error storing LLM metrics:', error);
      }
    } catch (error) {
      console.error('Failed to store metrics:', error);
    }
  }

  async getModelPerformance(provider: LLMProvider, days = 7): Promise<ModelPerformance[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('llm_metrics')
        .select('*')
        .eq('provider', provider)
        .gte('created_at', since.toISOString());

      if (error) throw error;

      const modelStats = data?.reduce((acc: any, metric: any) => {
        const key = `${metric.provider}-${metric.model}`;
        if (!acc[key]) {
          acc[key] = {
            provider: metric.provider,
            model: metric.model,
            totalResponseTime: 0,
            totalQualityScore: 0,
            totalCost: 0,
            totalTokensPerSecond: 0,
            successCount: 0,
            totalRequests: 0
          };
        }

        acc[key].totalResponseTime += metric.response_time;
        acc[key].totalQualityScore += metric.quality_score;
        acc[key].totalCost += metric.total_cost;
        acc[key].totalTokensPerSecond += metric.tokens_per_second;
        if (metric.success_rate > 50) acc[key].successCount++;
        acc[key].totalRequests++;

        return acc;
      }, {});

      return Object.values(modelStats || {}).map((stats: any) => ({
        provider: stats.provider,
        model: stats.model,
        averageResponseTime: stats.totalResponseTime / stats.totalRequests,
        averageQualityScore: stats.totalQualityScore / stats.totalRequests,
        averageCost: stats.totalCost / stats.totalRequests,
        successRate: (stats.successCount / stats.totalRequests) * 100,
        tokensPerSecond: stats.totalTokensPerSecond / stats.totalRequests,
        totalRequests: stats.totalRequests,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error getting model performance:', error);
      return [];
    }
  }

  async compareModels(days = 7): Promise<LLMComparison> {
    const allPerformances: ModelPerformance[] = [];

    // Get performance for all providers
    for (const provider of Object.keys(this.modelConfigs) as LLMProvider[]) {
      const performances = await this.getModelPerformance(provider, days);
      allPerformances.push(...performances);
    }

    // Find best models by category
    const bestForSpeed = allPerformances.reduce((best, current) => 
      current.averageResponseTime < best.averageResponseTime ? current : best
    );

    const bestForQuality = allPerformances.reduce((best, current) => 
      current.averageQualityScore > best.averageQualityScore ? current : best
    );

    const bestForCost = allPerformances.reduce((best, current) => 
      current.averageCost < best.averageCost ? current : best
    );

    // Calculate recommended model (balanced score)
    const recommendedModel = allPerformances.reduce((best, current) => {
      const currentScore = this.calculateBalancedScore(current);
      const bestScore = this.calculateBalancedScore(best);
      return currentScore > bestScore ? current : best;
    });

    return {
      models: allPerformances.sort((a, b) => 
        this.calculateBalancedScore(b) - this.calculateBalancedScore(a)
      ),
      bestForSpeed,
      bestForQuality,
      bestForCost,
      recommendedModel
    };
  }

  private calculateBalancedScore(performance: ModelPerformance): number {
    // Normalize scores (lower is better for response time and cost)
    const speedScore = Math.max(0, 100 - (performance.averageResponseTime / 100));
    const qualityScore = performance.averageQualityScore;
    const costScore = Math.max(0, 100 - (performance.averageCost * 10000));
    const reliabilityScore = performance.successRate;

    // Weighted average (quality and reliability are most important)
    return (speedScore * 0.2) + (qualityScore * 0.4) + (costScore * 0.2) + (reliabilityScore * 0.2);
  }

  getModelConfig(provider: LLMProvider): ModelConfig {
    return this.modelConfigs[provider];
  }

  getAllProviders(): LLMProvider[] {
    return Object.keys(this.modelConfigs) as LLMProvider[];
  }

  getAvailableModels(provider: LLMProvider): string[] {
    return this.modelConfigs[provider]?.models || [];
  }

  async testModelLatency(provider: LLMProvider, model: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simple test message to measure latency
      const testMessage = "Hello, respond with just 'OK'";
      
      // This would normally call the actual model API
      // For now, simulate based on provider characteristics
      const config = this.modelConfigs[provider];
      const simulatedLatency = Math.random() * 1000 + (config.maxTokensPerSecond > 50 ? 500 : 1500);
      
      await new Promise(resolve => setTimeout(resolve, simulatedLatency));
      
      return Date.now() - startTime;
    } catch (error) {
      console.error(`Latency test failed for ${provider}:${model}`, error);
      return -1;
    }
  }

  async benchmarkAllModels(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    
    for (const [provider, config] of Object.entries(this.modelConfigs)) {
      for (const model of config.models) {
        const latency = await this.testModelLatency(provider as LLMProvider, model);
        results[`${provider}-${model}`] = latency;
      }
    }
    
    return results;
  }
}

export const llmMetricsService = LLMMetricsService.getInstance();