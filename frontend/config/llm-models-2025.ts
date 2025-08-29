// Configuração atualizada de modelos LLM - Janeiro 2025
// Baseado nas documentações mais recentes de cada provedor

export interface ModelConfig {
  provider: string;
  model: string;
  displayName: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  averageLatency: number;
  contextWindow: number;
  available: boolean;
  description?: string;
}

export const UPDATED_MODEL_CONFIGS: ModelConfig[] = [
  // ============ ANTHROPIC CLAUDE - Modelos mais recentes ============
  {
    provider: 'anthropic',
    model: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1',
    costPerInputToken: 0.015 / 1000,
    costPerOutputToken: 0.075 / 1000,
    maxTokens: 4096,
    averageLatency: 4500,
    contextWindow: 200000,
    available: true,
    description: 'Modelo mais recente e poderoso da Anthropic'
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-20250122',
    displayName: 'Claude Opus 4',
    costPerInputToken: 0.015 / 1000,
    costPerOutputToken: 0.075 / 1000,
    maxTokens: 4096,
    averageLatency: 4000,
    contextWindow: 200000,
    available: true
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250122',
    displayName: 'Claude Sonnet 4',
    costPerInputToken: 0.008 / 1000,
    costPerOutputToken: 0.040 / 1000,
    maxTokens: 4096,
    averageLatency: 3500,
    contextWindow: 200000,
    available: true
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-3-7-20250122',
    displayName: 'Claude Sonnet 3.7',
    costPerInputToken: 0.003 / 1000,
    costPerOutputToken: 0.015 / 1000,
    maxTokens: 4096,
    averageLatency: 3000,
    contextWindow: 200000,
    available: true
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    costPerInputToken: 0.003 / 1000,
    costPerOutputToken: 0.015 / 1000,
    maxTokens: 4096,
    averageLatency: 3000,
    contextWindow: 200000,
    available: true
  },
  {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    costPerInputToken: 0.00025 / 1000,
    costPerOutputToken: 0.00125 / 1000,
    maxTokens: 4096,
    averageLatency: 1000,
    contextWindow: 200000,
    available: true
  },

  // ============ OPENAI GPT - Modelos atualizados ============
  {
    provider: 'openai',
    model: 'gpt-4.1',
    displayName: 'GPT-4.1',
    costPerInputToken: 0.01 / 1000,
    costPerOutputToken: 0.03 / 1000,
    maxTokens: 4096,
    averageLatency: 3500,
    contextWindow: 128000,
    available: true,
    description: 'GPT-4.1 - Versão otimizada do GPT-4'
  },
  {
    provider: 'openai',
    model: 'gpt-4-turbo-2024-04-09',
    displayName: 'GPT-4 Turbo',
    costPerInputToken: 0.01 / 1000,
    costPerOutputToken: 0.03 / 1000,
    maxTokens: 4096,
    averageLatency: 3500,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'openai',
    model: 'gpt-4-0125-preview',
    displayName: 'GPT-4 Preview',
    costPerInputToken: 0.01 / 1000,
    costPerOutputToken: 0.03 / 1000,
    maxTokens: 4096,
    averageLatency: 3500,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'openai',
    model: 'gpt-4o-2024-11-20',
    displayName: 'GPT-4o',
    costPerInputToken: 0.005 / 1000,
    costPerOutputToken: 0.015 / 1000,
    maxTokens: 4096,
    averageLatency: 3000,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini-2024-07-18',
    displayName: 'GPT-4o Mini',
    costPerInputToken: 0.00015 / 1000,
    costPerOutputToken: 0.0006 / 1000,
    maxTokens: 4096,
    averageLatency: 2000,
    contextWindow: 128000,
    available: true
  },
  // Experimental next-gen model (fallbacks apply if unavailable)
  {
    provider: 'openai',
    model: 'gpt-5',
    displayName: 'GPT-5',
    costPerInputToken: 0.01 / 1000, // provisional until benchmarked
    costPerOutputToken: 0.03 / 1000, // provisional until benchmarked
    maxTokens: 4096,
    averageLatency: 4000,
    contextWindow: 128000,
    available: true,
    description: 'Modelo de última geração da OpenAI (configuração provisória)'
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo-0125',
    displayName: 'GPT-3.5 Turbo',
    costPerInputToken: 0.0005 / 1000,
    costPerOutputToken: 0.0015 / 1000,
    maxTokens: 4096,
    averageLatency: 1500,
    contextWindow: 16385,
    available: true
  },

  // ============ GOOGLE GEMINI - Modelos mais recentes ============
  {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash (Experimental)',
    costPerInputToken: 0.00025 / 1000,
    costPerOutputToken: 0.001 / 1000,
    maxTokens: 8192,
    averageLatency: 1500,
    contextWindow: 1000000,
    available: true,
    description: 'Versão experimental do Gemini 2.0'
  },
  {
    provider: 'google',
    model: 'gemini-1.5-pro-002',
    displayName: 'Gemini 1.5 Pro',
    costPerInputToken: 0.00125 / 1000,
    costPerOutputToken: 0.005 / 1000,
    maxTokens: 8192,
    averageLatency: 2500,
    contextWindow: 2000000,
    available: true
  },
  {
    provider: 'google',
    model: 'gemini-1.5-flash-002',
    displayName: 'Gemini 1.5 Flash',
    costPerInputToken: 0.000075 / 1000,
    costPerOutputToken: 0.0003 / 1000,
    maxTokens: 8192,
    averageLatency: 1200,
    contextWindow: 1000000,
    available: true
  },

  // ============ DEEPSEEK - Modelos atualizados ============
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    displayName: 'DeepSeek Chat V2.5',
    costPerInputToken: 0.00014 / 1000,
    costPerOutputToken: 0.00028 / 1000,
    maxTokens: 8192,
    averageLatency: 2000,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'deepseek',
    model: 'deepseek-coder',
    displayName: 'DeepSeek Coder V2',
    costPerInputToken: 0.00014 / 1000,
    costPerOutputToken: 0.00028 / 1000,
    maxTokens: 8192,
    averageLatency: 2000,
    contextWindow: 128000,
    available: true
  },

  // ============ ZHIPUAI GLM - Modelos mais recentes ============
  {
    provider: 'zhipuai',
    model: 'glm-4-plus',
    displayName: 'GLM-4 Plus',
    costPerInputToken: 0.0015 / 1000,
    costPerOutputToken: 0.0015 / 1000,
    maxTokens: 8192,
    averageLatency: 2500,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'zhipuai',
    model: 'glm-4-flash',
    displayName: 'GLM-4 Flash',
    costPerInputToken: 0.0001 / 1000,
    costPerOutputToken: 0.0001 / 1000,
    maxTokens: 8192,
    averageLatency: 1500,
    contextWindow: 128000,
    available: true
  },
  {
    provider: 'zhipuai',
    model: 'glm-4',
    displayName: 'GLM-4',
    costPerInputToken: 0.001 / 1000,
    costPerOutputToken: 0.001 / 1000,
    maxTokens: 8192,
    averageLatency: 2000,
    contextWindow: 128000,
    available: true
  }
];

// Mapeamento de nomes antigos para novos (para compatibilidade)
export const MODEL_NAME_MAPPINGS: Record<string, string> = {
  // Anthropic mappings
  'claude-4-opus': 'claude-opus-4-1-20250805',
  'claude-4-sonnet': 'claude-sonnet-4-20250122',
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-sonnet': 'claude-sonnet-3-7-20250122',
  
  // OpenAI mappings
  'gpt-4': 'gpt-4-turbo-2024-04-09',
  'gpt-4-turbo': 'gpt-4-turbo-2024-04-09',
  'gpt-4-turbo-preview': 'gpt-4-0125-preview',
  'gpt-4.1': 'gpt-4-0125-preview',
  'gpt-4o': 'gpt-4o-2024-11-20',
  'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
  'gpt-3.5-turbo': 'gpt-3.5-turbo-0125',
  
  // Google mappings
  'gemini-pro': 'gemini-1.5-pro-002',
  'gemini-flash': 'gemini-1.5-flash-002',
  'gemini-2.0-flash': 'gemini-2.0-flash-exp',
  'gemini-1.5-pro': 'gemini-1.5-pro-002',
  'gemini-1.5-flash': 'gemini-1.5-flash-002',
  
  // ZhipuAI mappings
  'glm-4.5': 'glm-4-plus',
  'glm-4-0520': 'glm-4',
  
  // DeepSeek (mantém os mesmos)
  'deepseek-chat': 'deepseek-chat',
  'deepseek-coder': 'deepseek-coder'
};

// Função helper para obter o nome correto do modelo
export function getCorrectModelName(inputModel: string): string {
  // Se já é um nome completo correto, retorna ele mesmo
  if (UPDATED_MODEL_CONFIGS.some(config => config.model === inputModel)) {
    return inputModel;
  }
  
  // Tenta mapear nome antigo para novo
  return MODEL_NAME_MAPPINGS[inputModel] || inputModel;
}

// Função para obter configuração do modelo
export function getModelConfig(modelName: string): ModelConfig | undefined {
  const correctName = getCorrectModelName(modelName);
  return UPDATED_MODEL_CONFIGS.find(config => config.model === correctName);
}