import { Agent } from './agentsService';

// Interface base para todos os adapters de agentes externos
export interface IExternalAgentAdapter {
  process(agent: Agent, message: string, options?: AgentProcessOptions): Promise<AgentProcessResponse>;
  testConnection(agent: Agent): Promise<ConnectionTestResult>;
  validateConfig(apiConfig: any): boolean;
}

// Opções para processamento de mensagens
export interface AgentProcessOptions {
  sessionId?: string;
  userId?: string;
  userRole?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  context?: string[];
}

// Resposta padronizada de todos os adapters
export interface AgentProcessResponse {
  response: string;
  confidence: number;
  sources?: { tabular: number; conceptual: number };
  executionTime: number;
  metadata?: {
    model?: string;
    provider?: string;
    tokensUsed?: number;
    [key: string]: any;
  };
}

// Resultado de teste de conexão
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  error?: string;
  details?: any;
}

// Enum para plataformas suportadas
export enum AgentPlatform {
  DIFY = 'dify',
  LANGFLOW = 'langflow',
  CREWAI = 'crewai',
  CUSTOM = 'custom'
}

// Gateway principal para orquestração de agentes externos
export class ExternalAgentGateway {
  private adapters = new Map<AgentPlatform, IExternalAgentAdapter>();
  private initializationPromise: Promise<void> | null = null;
  private initialized = false;

  constructor() {
    // Inicializar adapters de forma assíncrona mas controlada
    this.initializationPromise = this.registerAdapters();
  }

  private async registerAdapters(): Promise<void> {
    try {
      // Import dinâmico dos adapters
      const [
        { DifyAdapter },
        { LangflowAdapter }, 
        { CrewAIAdapter }
      ] = await Promise.all([
        import('./adapters/difyAdapter'),
        import('./adapters/langflowAdapter'),
        import('./adapters/crewaiAdapter')
      ]);

      this.adapters.set(AgentPlatform.DIFY, new DifyAdapter());
      this.adapters.set(AgentPlatform.LANGFLOW, new LangflowAdapter());
      this.adapters.set(AgentPlatform.CREWAI, new CrewAIAdapter());

      this.initialized = true;
      console.log('✅ External Agent Adapters registered successfully');
    } catch (error) {
      console.error('❌ Failed to register adapters:', error);
      this.initialized = false;
      throw error;
    }
  }

  // Garantir que o gateway está inicializado
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
    
    if (!this.initialized || this.adapters.size === 0) {
      throw new Error('External Agent Gateway not properly initialized');
    }
  }

  // Processar mensagem através do agente especificado
  async processMessage(
    agent: Agent, 
    message: string, 
    options: AgentProcessOptions = {}
  ): Promise<AgentProcessResponse> {
    const startTime = Date.now();
    
    // Garantir que o gateway está inicializado
    await this.ensureInitialized();
    
    console.log(`🔧 ExternalAgentGateway.processMessage START:`, {
      agentId: agent.id,
      agentName: agent.name,
      provider: agent.provider,
      messageLength: message.length,
      options,
      adaptersCount: this.adapters.size
    });

    try {
      // Determinar plataforma baseada no provider ou API config
      const platform = this.detectPlatform(agent);
      
      // Obter adapter correspondente
      const adapter = this.adapters.get(platform);
      if (!adapter) {
        throw new Error(`No adapter found for platform: ${platform}`);
      }

      // Validar configuração do agente
      if (!adapter.validateConfig(agent.api_config)) {
        throw new Error(`Invalid configuration for agent: ${agent.name}`);
      }

      // Processar via adapter específico
      const result = await adapter.process(agent, message, options);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ ExternalAgentGateway.processMessage COMPLETE:`, {
        agentId: agent.id,
        platform,
        executionTime,
        success: true,
        responseLength: result.response?.length || 0,
        confidence: result.confidence
      });

      return {
        ...result,
        executionTime: result.executionTime || executionTime,
        metadata: {
          ...result.metadata,
          platform,
          gatewayExecutionTime: executionTime
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ ExternalAgentGateway.processMessage FAILED:`, {
        agentId: agent.id,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }

  // Testar conexão com um agente específico
  async testConnection(agent: Agent): Promise<ConnectionTestResult> {
    try {
      // Garantir que o gateway está inicializado
      await this.ensureInitialized();
      const platform = this.detectPlatform(agent);
      const adapter = this.adapters.get(platform);
      
      if (!adapter) {
        return {
          success: false,
          message: `No adapter found for platform: ${platform}`,
          error: 'ADAPTER_NOT_FOUND'
        };
      }

      return await adapter.testConnection(agent);
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Obter lista de plataformas suportadas
  getSupportedPlatforms(): AgentPlatform[] {
    return Array.from(this.adapters.keys());
  }

  // Verificar se um agente está configurado corretamente
  async validateAgent(agent: Agent): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Garantir que o gateway está inicializado
      await this.ensureInitialized();
      // Verificar se tem API config
      if (!agent.api_config) {
        errors.push('API configuration is missing');
        return { valid: false, errors };
      }

      // Detectar plataforma
      const platform = this.detectPlatform(agent);
      const adapter = this.adapters.get(platform);

      if (!adapter) {
        errors.push(`Unsupported platform: ${platform}`);
        return { valid: false, errors };
      }

      // Validar configuração específica
      if (!adapter.validateConfig(agent.api_config)) {
        errors.push('Invalid API configuration for selected platform');
      }

      // Teste de conexão básico
      const connectionTest = await this.testConnection(agent);
      if (!connectionTest.success) {
        errors.push(`Connection test failed: ${connectionTest.message}`);
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }

  // Detectar plataforma baseada no agente
  private detectPlatform(agent: Agent): AgentPlatform {
    // Primeiro tentar detectar pelo provider
    if (agent.provider) {
      const providerLower = agent.provider.toLowerCase();
      if (providerLower.includes('dify')) return AgentPlatform.DIFY;
      if (providerLower.includes('langflow')) return AgentPlatform.LANGFLOW;
      if (providerLower.includes('crewai') || providerLower.includes('crew')) return AgentPlatform.CREWAI;
    }

    // Detectar pela URL da API config
    if (agent.api_config?.base_url) {
      const url = agent.api_config.base_url.toLowerCase();
      if (url.includes('dify')) return AgentPlatform.DIFY;
      if (url.includes('langflow')) return AgentPlatform.LANGFLOW;
      if (url.includes('crewai')) return AgentPlatform.CREWAI;
    }

    // Default para custom se não conseguir detectar
    return AgentPlatform.CUSTOM;
  }
}

// Singleton instance
export const externalAgentGateway = new ExternalAgentGateway();