import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';
import { telemetryService } from '../telemetryService';

/**
 * Wrapper de fetch com fallback para XMLHttpRequest no Safari iOS
 * Resolve bug do iOS 18+ onde AbortController causa "signal is aborted without reason"
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 60000, ...fetchOptions } = options;
  
  // Detectar Safari iOS (incluindo Chrome iOS que usa WebKit)
  const userAgent = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/i.test(userAgent);
  const isSafariIOS = isiOS && isWebKit;

  // 📊 Telemetria: Detecção de plataforma
  telemetryService.logPlatformDetection({
    userAgent: userAgent.substring(0, 200),
    isiOS,
    isWebKit,
    isSafariIOS,
    willUseXHR: isSafariIOS,
    navigatorPlatform: navigator.platform,
    windowWidth: window.innerWidth
  }).catch(err => console.error('Telemetry failed:', err));

  // WORKAROUND: Usar XMLHttpRequest no Safari iOS para evitar bug do iOS 18+
  if (isSafariIOS) {
    console.log('🍎 [iOS Workaround] Using XMLHttpRequest instead of fetch');
    telemetryService.logInfo('iOS Workaround activated - Using XMLHttpRequest').catch(() => {});
    
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 📊 Telemetria: XHR Start
      telemetryService.logXHRStart(url, fetchOptions.method || 'GET').catch(() => {});
      
      xhr.open(fetchOptions.method || 'GET', url);
      
      // Headers
      if (fetchOptions.headers) {
        const headers = fetchOptions.headers as Record<string, string>;
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });
      }
      
      // Timeout
      xhr.timeout = timeout;
      xhr.ontimeout = () => {
        const error = new Error(`Timeout: O agente demorou mais de ${timeout/1000}s para responder. Tente novamente ou use uma mensagem mais curta.`);
        telemetryService.logXHRError(error, xhr.readyState).catch(() => {});
        reject(error);
      };
      
      // Success
      xhr.onload = () => {
        // 📊 Telemetria: XHR Success
        telemetryService.logXHRSuccess(xhr.status, xhr.responseText.length).catch(() => {});
        
        const headers = new Headers();
        xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
          const [key, value] = line.split(': ');
          if (key && value) headers.append(key, value);
        });
        
        resolve(new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers
        }));
      };
      
      // Error
      xhr.onerror = () => {
        const error = new Error(`Network error: ${xhr.statusText || 'Request failed'}`);
        telemetryService.logXHRError(error, xhr.readyState).catch(() => {});
        reject(error);
      };
      
      // Send
      xhr.send(fetchOptions.body as string || null);
    });
  }
  
  // Navegadores normais: usar fetch padrão com AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout: O agente demorou mais de ${timeout/1000}s para responder. Tente novamente ou use uma mensagem mais curta.`);
    }
    throw error;
  }
}

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
    
    // Configurar contexto de telemetria
    telemetryService.setContext(options.sessionId || null, options.userId || null);
    
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

      try {
        console.log('🍎 [Mobile Debug] About to call fetchWithTimeout');
        console.log('🍎 [Mobile Debug] URL:', url);
        console.log('🍎 [Mobile Debug] Payload:', JSON.stringify(payload).substring(0, 200));
        
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          timeout: 60000 // 60 segundos
        });

        console.log('🍎 [Mobile Debug] fetchWithTimeout returned response');
        console.log('🍎 [Mobile Debug] Response status:', response.status);
        console.log('🍎 [Mobile Debug] Response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Dify API error: ${response.status} - ${errorText}`);
        }

        console.log('🍎 [Mobile Debug] About to parse response.json()');
        let data;
        try {
          data = await response.json();
          console.log('🍎 [Mobile Debug] response.json() SUCCESS');
          console.log('🍎 [Mobile Debug] Data keys:', Object.keys(data));
          
          // 📊 Telemetria: JSON Parse Success
          telemetryService.logJSONParse(true).catch(() => {});
        } catch (jsonError) {
          console.error('🍎 [Mobile Debug] response.json() FAILED:', jsonError);
          console.error('🍎 [Mobile Debug] JSON Error name:', jsonError instanceof Error ? jsonError.name : 'unknown');
          console.error('🍎 [Mobile Debug] JSON Error message:', jsonError instanceof Error ? jsonError.message : 'unknown');
          
          // 📊 Telemetria: JSON Parse Failed
          telemetryService.logJSONParse(false, jsonError as Error).catch(() => {});
          
          // 🍎 iOS 18 BUG WORKAROUND: Tentar response.text() se json() falhar
          try {
            const textResponse = await response.text();
            console.log('🍎 [Mobile Debug] response.text() SUCCESS, length:', textResponse.length);
            data = JSON.parse(textResponse);
            console.log('🍎 [Mobile Debug] Manual JSON.parse() SUCCESS');
            
            // 📊 Telemetria: Manual JSON.parse succeeded
            telemetryService.logInfo('Manual JSON.parse succeeded after response.text()', {
              responseLength: textResponse.length
            }).catch(() => {});
          } catch (textError) {
            console.error('🍎 [Mobile Debug] response.text() also FAILED:', textError);
            
            // 📊 Telemetria: Complete failure
            telemetryService.logError(textError as Error, 'response.text() also failed').catch(() => {});
            
            throw jsonError; // Re-throw original error
          }
        }
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
        throw fetchError; // Erro já formatado por fetchWithTimeout
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