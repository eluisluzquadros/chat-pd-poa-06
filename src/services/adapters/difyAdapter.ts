import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';
import { telemetryService } from '../telemetryService';
import { ERROR_MESSAGES } from '@/utils/errorMessages';

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
    telemetryService.logInfoOld('iOS: Using fetch without AbortController').catch(() => {});
    
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
 * Safari iOS tem limitações com ReadableStream que requerem workarounds
 */
function isIOSSafari(): boolean {
  // Verificar se está no navegador (não Node.js)
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isChrome = /CriOS|Chrome|EdgiOS|FxiOS/.test(ua); // Chrome, Edge, Firefox no iOS
  
  // iOS Safari: deve ser iOS + WebKit + NÃO outro browser
  const isiOSSafari = isIOS && isWebKit && !isChrome;
  
  console.log('🔍 [isIOSSafari] Detection:', {
    isiOSSafari,
    isIOS,
    isWebKit,
    isChrome,
    ua: ua.substring(0, 100)
  });
  
  return isiOSSafari;
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
    // 🔥 TELEMETRIA: Início do processamento iOS
    await telemetryService.logInfo('DifyAdapter', 'processStreamForiOS started');
    
    console.log('🍎 [iOS] Using iOS-specific SSE processing');
    
    let fullAnswer = '';
    let conversationId = '';
    let messageId = '';
    let metadata: any = {};
    
    // Para iOS: ler o body como texto completo (não streaming chunk-a-chunk)
    // Isso funciona porque Dify envia eventos SSE sequencialmente
    let text: string;
    try {
      // Verificar se body já foi consumido
      if (response.bodyUsed) {
        console.warn('⚠️ [iOS] Response body already consumed, cannot read');
        
        // 🔥 TELEMETRIA: Body já consumido
        await telemetryService.logWarn('DifyAdapter', 'Response body already consumed');
        
        throw new Error('Response body already consumed');
      }
      
      text = await response.text();
      
      // 🔥 TELEMETRIA: Texto lido com sucesso
      await telemetryService.logInfo('DifyAdapter', 'Response text read', {
        textLength: text.length,
        firstChars: text.substring(0, 100)
      });
      
      console.log('🍎 [iOS] Successfully read response text:', {
        textLength: text.length,
        firstChars: text.substring(0, 100)
      });
    } catch (readError) {
      console.error('❌ [iOS] Failed to read response text:', readError);
      
      // 🔥 TELEMETRIA: Falha ao ler texto
      await telemetryService.logError('DifyAdapter', 'Failed to read response text', readError as Error);
      
      throw readError;
    }
    
    const lines = text.split('\n');
    console.log('🍎 [iOS] Split into lines:', lines.length);
    
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
    
    // 🔥 TELEMETRIA: Processamento completo
    await telemetryService.logInfo('DifyAdapter', 'processStreamForiOS completed', {
      fullAnswerLength: fullAnswer.length,
      conversationId
    });
    
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
    
    // 🔥 TELEMETRIA: Log de início
    await telemetryService.logInfo('DifyAdapter', 'Process started', {
      agentId: agent.id,
      agentName: agent.name,
      messageLength: message.length,
      hasApiConfig: !!agent.api_config,
      hasDifyConfig: !!(agent as any).dify_config
    });
    
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

      // ✅ SOLUÇÃO iOS: Detectar iOS Safari e usar proxy
      const detectedAsIOSSafari = isIOSSafari();
      await telemetryService.logInfo('DifyAdapter', 'Detected platform', { 
        isIOSSafari: detectedAsIOSSafari 
      });

      let response: Response;

      if (detectedAsIOSSafari) {
        // iOS Safari: Usar edge function proxy para evitar CORS
        const proxyUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/dify-proxy';
        
        console.log('🍎 [iOS] Using proxy for iOS Safari:', proxyUrl);
        await telemetryService.logInfo('DifyAdapter', 'Using proxy for iOS', { proxyUrl });
        
        try {
          response = await fetchWithTimeout(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg',
            },
            body: JSON.stringify({
              baseUrl: base_url,
              endpoint: endpoint,
              headers: headers,
              body: payload,
            }),
            timeout: 60000
          });
        } catch (proxyError) {
          console.error('❌ [iOS] Proxy failed:', proxyError);
          await telemetryService.logError('DifyAdapter', 'Proxy failed', proxyError as Error);
          throw proxyError;
        }
      } else {
        // Desktop/Android: Requisição direta (funciona normalmente)
        console.log('🖥️ [Desktop] Using direct request');
        
        try {
          console.log('🍎 [Mobile Debug] About to call fetchWithTimeout');
          console.log('🍎 [Mobile Debug] URL:', url);
          console.log('🍎 [Mobile Debug] Payload:', JSON.stringify(payload).substring(0, 200));
          
          response = await fetchWithTimeout(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            timeout: 60000 // 60 segundos
          });
        } catch (directError) {
          console.error('❌ [Desktop] Direct request failed:', directError);
          await telemetryService.logError('DifyAdapter', 'Direct request failed', directError as Error);
          throw directError;
        }
      }

      // 🔥 TELEMETRIA: Fetch completado
      await telemetryService.logInfo('DifyAdapter', 'Fetch completed', {
        isIOSSafari: detectedAsIOSSafari,
        usedProxy: detectedAsIOSSafari,
        responseOk: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      console.log('🍎 [Mobile Debug] fetchWithTimeout returned response');
      console.log('🍎 [Mobile Debug] Response status:', response.status);
      console.log('🍎 [Mobile Debug] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        await telemetryService.logError('DifyAdapter', 'HTTP error from Dify API', undefined, {
          status: response.status,
          errorText: errorText.substring(0, 500)
        });
        throw new Error(`Dify API error: ${response.status} - ${errorText}`);
      }

      // ✅ CRÍTICO: Clonar response ANTES de qualquer tentativa de leitura do body
      // Isso permite fallback se o primeiro método falhar
      const responseClone = response.clone();

      // ✅ Processar resposta em streaming (SSE)
      console.log('🍎 [Streaming] Starting SSE processing');
      telemetryService.logInfo('Starting SSE streaming mode').catch(() => {});

      let fullAnswer = '';
      let difyConversationId = '';
      let difyMessageId = '';
      let metadata: any = {};

      // 🔥 CRITICAL: iOS Safari precisa de abordagem diferente para streams
      if (detectedAsIOSSafari) {
        console.log('🍎 [iOS] Detected iOS Safari, using iOS-specific stream processing');
        try {
          // Usar response original para método iOS
          const result = await this.processStreamForiOS(response);
          fullAnswer = result.fullAnswer;
          difyConversationId = result.conversationId;
          difyMessageId = result.messageId;
          metadata = result.metadata;
        } catch (iosError) {
          // Se falhar, tentar com o clone
          console.error('🍎 [iOS] Primary iOS method failed, trying clone:', iosError);
          const result = await this.processStreamForiOS(responseClone);
          fullAnswer = result.fullAnswer;
          difyConversationId = result.conversationId;
          difyMessageId = result.messageId;
          metadata = result.metadata;
        }
      } else {
        // Desktop/Android: usar ReadableStream.getReader() padrão
        console.log('🖥️ [Desktop] Using standard ReadableStream processing');
        
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            // Fallback: usar o clone com método iOS
            console.warn('⚠️ [Fallback] getReader() failed, trying iOS method with clone');
            telemetryService.logInfo('Fallback: Using iOS method after getReader failed').catch(() => {});
            const result = await this.processStreamForiOS(responseClone);
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
          // Se qualquer erro ocorrer, tentar método iOS com clone
          console.error('❌ [Stream Error] Standard processing failed:', streamError);
          console.log('🔄 [Fallback] Attempting iOS method with clone as last resort');
          telemetryService.logError(streamError as Error, 'Stream processing - trying iOS fallback with clone').catch(() => {});
          
          const result = await this.processStreamForiOS(responseClone);
          fullAnswer = result.fullAnswer;
          difyConversationId = result.conversationId;
          difyMessageId = result.messageId;
          metadata = result.metadata;
        }
      }

      // Armazenar conversation_id retornado pelo Dify para uso futuro
      if (difyConversationId && difyConversationId !== conversationId) {
        this.conversationMapping.set(sessionId, difyConversationId);
        console.log('💾 DifyAdapter stored conversation mapping:', {
          sessionId,
          difyConversationId,
          wasNewConversation: !storedConversationId
        });
      }

      const executionTime = Date.now() - startTime;
      
      // 🔥 TELEMETRIA: Processo completo com sucesso
      await telemetryService.logInfo('DifyAdapter', 'Process completed successfully', {
        executionTime,
        responseLength: fullAnswer?.length,
        hasConversationId: !!difyConversationId
      });

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
        response: fullAnswer || ERROR_MESSAGES.SYSTEM_UNAVAILABLE,
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
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 🔥 TELEMETRIA: Log técnico apenas para devs
      telemetryService.logError('DifyAdapter', 'Process failed', error as Error, {
        executionTime
      }).catch(() => {});
      
      // ✅ Log resumido sem dados sensíveis
      console.error('❌ DifyAdapter.process FAILED:', {
        agentId: agent.id,
        executionTime,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      // ✅ Criar erro com mensagem amigável
      const friendlyError = new Error(ERROR_MESSAGES.SYSTEM_UNAVAILABLE);
      friendlyError.name = 'ServiceUnavailable';
      throw friendlyError;
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
      base_url: 'https://api.dify.ai/v1',
      service_api_endpoint: '/chat-messages',
      api_key: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      app_id: 'app-xxxxxxxxxxxxxxxxxxxxxxxx',
      public_url: 'https://api.dify.ai/v1',
      server_url: 'https://udify.app/chat/XXXXX'
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