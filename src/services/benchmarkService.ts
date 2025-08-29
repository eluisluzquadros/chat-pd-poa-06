export interface ModelConfig {
  name: string;
  provider: 'google' | 'openai' | 'deepseek' | 'anthropic' | 'zhipuai';
  displayName: string;
  description: string;
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    name: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    description: 'OpenAI GPT-4o'
  }
];

export class BenchmarkService {
  async getResults() {
    return [];
  }

  async saveBenchmark() {
    return { success: true };
  }
}