import { LLMProvider } from '@/types/chat';

export interface ModelConfig {
  name: string;
  provider: LLMProvider;
  costPerInputToken: number;
  costPerOutputToken: number;
}

export class LLMMetricsService {
  async getMetrics() {
    return [];
  }

  async trackUsage() {
    return { success: true };
  }

  async compareModels() {
    return null;
  }

  async benchmarkAllModels() {
    return {};
  }
}

export const llmMetricsService = new LLMMetricsService();