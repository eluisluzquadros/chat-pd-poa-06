import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';

export class DifyAdapter implements IExternalAgentAdapter {
  
  async process(
    agent: Agent, 
    message: string, 
    options: AgentProcessOptions = {}
  ): Promise<AgentProcessResponse> {
    const startTime = Date.now();
    
    console.log('🔧 DifyAdapter.process START:', {
      agentId: agent.id,
      agentName: agent.name,
      messageLength: message.length,
      baseUrl: agent.api_config?.base_url,
      appId: agent.api_config?.app_id
    });

    try {
      // Validar configuração
      if (!this.validateConfig(agent.api_config)) {
        throw new Error('Invalid Dify configuration');
      }

      const { base_url, service_api_endpoint, api_key, app_id } = agent.api_config!;
      
      // Construir URL do endpoint
      const endpoint = service_api_endpoint || '/api/chat-messages';
      const url = `${base_url}${endpoint}`;

      // Preparar payload para Dify
      // Validar UUID do sessionId - Dify espera UUIDs válidos ou string vazia
      const validSessionId = this.validateUUID(options.sessionId) ? options.sessionId : '';
      
      console.log('🔧 DifyAdapter sessionId validation:', {
        originalSessionId: options.sessionId,
        isValidUUID: this.validateUUID(options.sessionId),
        finalSessionId: validSessionId
      });
      
      const payload = {
        inputs: {},
        query: message,
        response_mode: options.stream ? 'streaming' : 'blocking',
        conversation_id: validSessionId,
        user: options.userId || 'anonymous',
        auto_generate_name: false
      };

      // Headers para autenticação
      const headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatPD-POA/1.0'
      };

      console.log('📡 DifyAdapter making request to:', url);

      // Fazer requisição
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.maxTokens || 30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      console.log('✅ DifyAdapter.process COMPLETE:', {
        agentId: agent.id,
        executionTime,
        hasResponse: !!data.answer,
        responseLength: data.answer?.length || 0
      });

      // Mapear resposta para formato padrão
      return {
        response: data.answer || data.result || 'No response from Dify agent',
        confidence: 0.85, // Dify não retorna confidence, usar valor padrão
        sources: { tabular: 0, conceptual: 0 }, // Pode ser expandido baseado nos dados do Dify
        executionTime,
        metadata: {
          model: agent.model,
          provider: 'dify',
          conversationId: data.conversation_id,
          messageId: data.message_id,
          tokensUsed: data.metadata?.usage?.total_tokens || 0,
          difyData: data
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ DifyAdapter.process FAILED:', {
        agentId: agent.id,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  async testConnection(agent: Agent): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.validateConfig(agent.api_config)) {
        return {
          success: false,
          message: 'Invalid Dify configuration',
          error: 'INVALID_CONFIG'
        };
      }

      const { base_url, api_key, app_id } = agent.api_config!;
      
      // Usar endpoint válido da API Dify para testar conexão
      const url = `${base_url}/v1/parameters`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout para teste
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'Dify connection successful',
          latency,
          details: { status: response.status }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Dify connection failed: ${response.status}`,
          latency,
          error: errorText
        };
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        message: 'Dify connection test failed',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    // Campos obrigatórios para Dify
    const requiredFields = ['base_url', 'api_key', 'app_id'];
    
    return requiredFields.every(field => {
      const value = apiConfig[field];
      return value && typeof value === 'string' && value.trim().length > 0;
    });
  }

  // Validar se string é UUID válido (formato v4)
  private validateUUID(uuid?: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Método para gerar configuração exemplo do Dify
  static getExampleConfig() {
    return {
      base_url: 'https://cloud.dify.ai',
      service_api_endpoint: '/api/chat-messages',
      api_key: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      app_id: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      public_url: 'https://cloud.dify.ai',
      server_url: 'https://cloud.dify.ai'
    };
  }

  // Método para detectar se uma configuração é do Dify
  static isDifyConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    const url = apiConfig.base_url?.toLowerCase() || '';
    const apiKey = apiConfig.api_key?.toLowerCase() || '';
    
    return url.includes('dify') || apiKey.startsWith('app-');
  }
}