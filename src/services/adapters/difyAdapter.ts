import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';

/**
 * DifyAdapter - Adapter para integração com a API Dify
 * 
 * Implementa mapeamento de conversações para resolver o erro "Conversation Not Exists":
 * - Para novas conversações: envia conversation_id como string vazia ""
 * - Dify retorna um conversation_id na resposta
 * - Armazena o mapeamento: sessionId → dify_conversation_id
 * - Para mensagens subsequentes: usa o dify_conversation_id armazenado
 * 
 * Isso resolve o problema onde enviávamos o sessionId UUID diretamente,
 * mas Dify não reconhece UUIDs arbitrários como conversation_id válidos.
 */
export class DifyAdapter implements IExternalAgentAdapter {
  // In-memory storage for session to Dify conversation mapping
  private conversationMapping = new Map<string, string>();
  
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
      const endpoint = service_api_endpoint || '/v1/chat-messages';
      const url = `${base_url}${endpoint}`;

      // Preparar payload para Dify
      // Implementar mapeamento de conversação: sessionId -> dify_conversation_id
      const sessionId = options.sessionId || 'default';
      const storedConversationId = this.conversationMapping.get(sessionId);
      
      // Para novas conversações: usar string vazia
      // Para conversações existentes: usar conversation_id armazenado
      const conversationId = storedConversationId || '';
      
      console.log('🔧 DifyAdapter conversation mapping:', {
        sessionId,
        storedConversationId,
        isNewConversation: !storedConversationId,
        finalConversationId: conversationId
      });
      
      const payload = {
        inputs: {},
        query: message,
        response_mode: 'blocking', // Forçar modo blocking para JSON response
        conversation_id: conversationId,
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

      // ✅ CORRIGIDO: Implementar timeout manual compatível com Safari iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Dify API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const executionTime = Date.now() - startTime;

        // Armazenar conversation_id retornado pelo Dify para uso futuro
        if (data.conversation_id && data.conversation_id !== conversationId) {
          this.conversationMapping.set(sessionId, data.conversation_id);
          console.log('💾 DifyAdapter stored conversation mapping:', {
            sessionId,
            difyConversationId: data.conversation_id,
            wasNewConversation: !storedConversationId
          });
        }

        console.log('✅ DifyAdapter.process COMPLETE:', {
          agentId: agent.id,
          executionTime,
          hasResponse: !!data.answer,
          responseLength: data.answer?.length || 0,
          conversationId: data.conversation_id,
          messageId: data.message_id
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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

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

  // Métodos para gerenciar mapeamento de conversações
  
  /**
   * Obtém o conversation_id do Dify para uma sessão específica
   */
  getStoredConversationId(sessionId: string): string | undefined {
    return this.conversationMapping.get(sessionId);
  }

  /**
   * Limpa o mapeamento de conversação para uma sessão específica
   */
  clearConversationMapping(sessionId: string): void {
    this.conversationMapping.delete(sessionId);
    console.log('🗑️ DifyAdapter cleared conversation mapping for session:', sessionId);
  }

  /**
   * Limpa todos os mapeamentos de conversação
   */
  clearAllConversationMappings(): void {
    const count = this.conversationMapping.size;
    this.conversationMapping.clear();
    console.log('🗑️ DifyAdapter cleared all conversation mappings:', { count });
  }

  /**
   * Retorna estatísticas dos mapeamentos de conversação
   */
  getConversationMappingStats(): { totalSessions: number; sessions: string[] } {
    return {
      totalSessions: this.conversationMapping.size,
      sessions: Array.from(this.conversationMapping.keys())
    };
  }

  // Método para gerar configuração exemplo do Dify
  static getExampleConfig() {
    return {
      base_url: 'https://api.dify.ai',
      service_api_endpoint: '/v1/chat-messages',
      api_key: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      app_id: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      public_url: 'https://udify.app/chat/XXXXX',
      server_url: 'https://api.dify.ai'
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