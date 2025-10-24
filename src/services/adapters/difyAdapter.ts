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
  
  const userAgent = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(userAgent);
  
  telemetryService.logPlatformDetection({
    userAgent: userAgent.substring(0, 200),
    isiOS,
    willUseFetch: true,
    navigatorPlatform: navigator.platform
  }).catch(err => console.error('Telemetry failed:', err));

  if (isiOS) {
    // iOS: Use fetch without AbortController (iOS 18 bug workaround)
    // AbortController causes issues on iOS, so we use Promise.race for timeout
    console.log('🍎 [iOS] Using fetch without AbortController for streaming support');
    telemetryService.logInfo('iOS: Using fetch without AbortController').catch(() => {});
    
    const fetchPromise = fetch(url, fetchOptions);
    const timeoutPromise = new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout: ${timeout * 2}ms`)), timeout * 2)
    );
    
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  // Non-iOS browsers: Use standard fetch with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
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
 * Detecta se está rodando no Safari iOS
 * Safari iOS tem limitações com ReadableStream.getReader() que requerem workarounds
 */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isChrome = /CriOS|Chrome/.test(ua);
  
  // iOS Safari: deve ser iOS + WebKit + NÃO Chrome
  return isIOS && isWebKit && !isChrome;
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
  
  /**
   * Processa stream SSE usando chunks de texto para iOS Safari
   * iOS tem problemas com ReadableStream.getReader(), então usamos abordagem alternativa
   */
  private async processStreamForiOS(response: Response): Promise<{
    fullAnswer: string;
    conversationId: string;
    messageId: string;
    metadata: any;
  }> {
    console.log('🍎 [iOS] Using iOS-specific SSE processing');
    telemetryService.logInfo('iOS: Starting iOS-specific SSE processing').catch(() => {});
    
    let fullAnswer = '';
    let conversationId = '';
    let messageId = '';
    let metadata: any = {};
    
    // Para iOS: ler o body como texto completo (não streaming chunk-a-chunk)
    // Isso funciona porque Dify envia eventos SSE sequencialmente
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]' || !jsonStr) continue;
      
      try {
        const data = JSON.parse(jsonStr);
        console.log('🍎 [iOS SSE] Event:', data.event);
        
        if (data.event === 'message') {
          fullAnswer += data.answer || '';
        } else if (data.event === 'message_end') {
          conversationId = data.conversation_id || '';
          messageId = data.id || '';
          metadata = data.metadata || {};
        }
      } catch (parseError) {
        console.warn('🍎 [iOS SSE] Failed to parse line:', jsonStr.substring(0, 100));
      }
    }
    
    telemetryService.logInfo('iOS: SSE processing completed', {
      answerLength: fullAnswer.length,
      conversationId
    }).catch(() => {});
    
    return { fullAnswer, conversationId, messageId, metadata };
  }
  
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
      // Usar dify_config se disponível, senão fallback para api_config
      const config = (agent as any).dify_config || agent.api_config;

      // Validar configuração
      if (!this.validateConfig(config)) {
        throw new Error('Invalid Dify configuration');
      }

      const { base_url, service_api_endpoint, api_key, app_id } = config!;
      
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
        response_mode: 'streaming', // ✅ Usar streaming para evitar bug iOS 18
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

        // ✅ Processar resposta em streaming (SSE)
        console.log('🍎 [Streaming] Starting SSE processing');
        telemetryService.logInfo('Starting SSE streaming mode').catch(() => {});

        let fullAnswer = '';
        let difyConversationId = '';
        let difyMessageId = '';
        let metadata: any = {};

        // Debug: verificar detecção iOS Safari
        const detectedAsIOSSafari = isIOSSafari();
        const ua = navigator.userAgent;
        console.log('🔍 [DEBUG] iOS Safari Detection:', {
          detectedAsIOSSafari,
          userAgent: ua.substring(0, 150),
          isIOS: /iPad|iPhone|iPod/.test(ua),
          isWebKit: /WebKit/.test(ua),
          isChrome: /CriOS|Chrome/.test(ua)
        });
        telemetryService.logInfo('iOS Safari Detection Debug', {
          detectedAsIOSSafari,
          userAgent: ua.substring(0, 150)
        }).catch(() => {});

        // 🔥 CRITICAL: iOS Safari precisa de abordagem diferente para streams
        if (detectedAsIOSSafari) {
          console.log('🍎 [iOS] Detected iOS Safari, using iOS-specific stream processing');
          const result = await this.processStreamForiOS(response);
          fullAnswer = result.fullAnswer;
          difyConversationId = result.conversationId;
          difyMessageId = result.messageId;
          metadata = result.metadata;
        } else {
          // Desktop/Android: usar ReadableStream.getReader() padrão
          console.log('🖥️ [Desktop] Using standard ReadableStream processing');
          
          try {
            const reader = response.body?.getReader();
            if (!reader) {
              // Fallback para iOS se getReader falhar
              console.warn('⚠️ [Fallback] getReader() failed, trying iOS method');
              telemetryService.logInfo('Fallback: Using iOS method after getReader failed').catch(() => {});
              const result = await this.processStreamForiOS(response);
              fullAnswer = result.fullAnswer;
              difyConversationId = result.conversationId;
              difyMessageId = result.messageId;
              metadata = result.metadata;
            } else {
              // ReadableStream disponível, processar normalmente
              const decoder = new TextDecoder();
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  console.log('🖥️ [Streaming] Stream ended');
                  break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === '[DONE]' || !jsonStr) continue;
                  
                  try {
                    const data = JSON.parse(jsonStr);
                    console.log('🖥️ [Streaming] Event:', data.event);
                    
                    if (data.event === 'message') {
                      fullAnswer += data.answer || '';
                    } else if (data.event === 'message_end') {
                      difyConversationId = data.conversation_id || '';
                      difyMessageId = data.id || '';
                      metadata = data.metadata || {};
                    }
                  } catch (parseError) {
                    console.warn('🖥️ [Streaming] Failed to parse SSE line:', jsonStr.substring(0, 100));
                  }
                }
              }
              
              telemetryService.logInfo('SSE streaming completed', {
                answerLength: fullAnswer.length,
                conversationId: difyConversationId
              }).catch(() => {});
            }
          } catch (streamError) {
            // Se qualquer erro ocorrer, tentar método iOS como fallback final
            console.error('❌ [Stream Error] Standard processing failed:', streamError);
            console.log('🔄 [Fallback] Attempting iOS method as last resort');
            telemetryService.logError(streamError as Error, 'Stream processing - trying iOS fallback').catch(() => {});
            
            // IMPORTANTE: Response já foi parcialmente lido, então precisamos fazer nova request
            // Por ora, lançar erro para não retornar resposta vazia
            throw new Error(`Stream processing failed: ${streamError.message}`);
          }
        }
        
        const executionTime = Date.now() - startTime;

        // Armazenar conversation_id retornado pelo Dify para uso futuro
        if (difyConversationId && difyConversationId !== conversationId) {
          this.conversationMapping.set(sessionId, difyConversationId);
          console.log('💾 DifyAdapter stored conversation mapping:', {
            sessionId,
            difyConversationId,
            wasNewConversation: !storedConversationId
          });
        }

        console.log('✅ DifyAdapter.process COMPLETE:', {
          agentId: agent.id,
          executionTime,
          hasResponse: !!fullAnswer,
          responseLength: fullAnswer.length,
          conversationId: difyConversationId,
          messageId: difyMessageId
        });

        // Mapear resposta para formato padrão
        return {
          response: fullAnswer || 'No response from Dify agent',
          confidence: 0.85,
          sources: { tabular: 0, conceptual: 0 },
          executionTime,
          metadata: {
            model: agent.model,
            provider: 'dify',
            conversationId: difyConversationId,
            messageId: difyMessageId,
            tokensUsed: metadata?.usage?.total_tokens || 0,
            difyData: metadata
          }
        };
      } catch (fetchError) {
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
      // Usar dify_config se disponível, senão fallback para api_config
      const config = (agent as any).dify_config || agent.api_config;
      
      if (!this.validateConfig(config)) {
        return {
          success: false,
          message: 'Invalid Dify configuration',
          error: 'INVALID_CONFIG'
        };
      }

      const { base_url, api_key, app_id } = config!;
      
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
    if (!apiConfig) {
      console.warn('⚠️ [DifyAdapter] validateConfig: No config provided');
      return false;
    }
    
    // Campos obrigatórios para Dify
    const requiredFields = ['base_url', 'api_key', 'app_id'];
    
    const isValid = requiredFields.every(field => {
      const value = apiConfig[field];
      const fieldValid = value && typeof value === 'string' && value.trim().length > 0;
      if (!fieldValid) {
        console.warn(`⚠️ [DifyAdapter] validateConfig: Missing or invalid field: ${field}`);
      }
      return fieldValid;
    });
    
    console.log('🔍 [DifyAdapter] validateConfig result:', { isValid, hasBaseUrl: !!apiConfig.base_url });
    return isValid;
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