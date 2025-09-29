import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';

export class CrewAIAdapter implements IExternalAgentAdapter {
  
  async process(
    agent: Agent, 
    message: string, 
    options: AgentProcessOptions = {}
  ): Promise<AgentProcessResponse> {
    const startTime = Date.now();
    
    console.log('🔧 CrewAIAdapter.process START:', {
      agentId: agent.id,
      agentName: agent.name,
      messageLength: message.length,
      baseUrl: agent.api_config?.base_url,
      workflowId: agent.api_config?.workflow_id
    });

    try {
      // Validar configuração
      if (!this.validateConfig(agent.api_config)) {
        throw new Error('Invalid CrewAI configuration');
      }

      const { base_url, api_key, workflow_id } = agent.api_config!;
      
      // Construir URL do endpoint para CrewAI (baseado na documentação oficial)
      const endpoint = '/kickoff';
      const url = `${base_url}${endpoint}`;

      // Preparar payload para CrewAI (formato correto baseado na documentação)
      const payload = {
        inputs: {
          user_query: message, // Campo principal usado pelos crews
          ...(options.context && { context: options.context })
        }
      };

      // Headers para autenticação
      const headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatPD-POA/1.0'
      };

      console.log('📡 CrewAIAdapter making request to:', url);

      // Fazer requisição
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30s para kickoff inicial (apenas para iniciar a task)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CrewAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      console.log('✅ CrewAIAdapter.process COMPLETE:', {
        agentId: agent.id,
        executionTime,
        hasResponse: !!data.output,
        dataKeys: Object.keys(data)
      });

      // Mapear resposta para formato padrão
      // CrewAI /kickoff retorna kickoff_id, depois deve verificar status
      let responseText = '';
      
      if (data.kickoff_id && typeof data.kickoff_id === 'string') {
        const kickoffId = data.kickoff_id;
        console.log('🎯 CrewAI kickoff_id received:', kickoffId);
        
        // Aguardar resultado com polling inteligente
        responseText = await this.pollForResult(base_url, kickoffId as string, headers);
        
      } else if (data.output || data.result) {
        // Resposta direta (caso não seja async)
        responseText = data.output || data.result;
        console.log('✅ CrewAI direct response received');
      } else {
        responseText = 'No response from CrewAI agents';
        console.log('⚠️ CrewAI no response data');
      }

      return {
        response: responseText,
        confidence: data.confidence || 0.75, // CrewAI pode retornar confidence baseado na crew
        sources: { 
          tabular: data.sources?.tabular || 0, 
          conceptual: data.sources?.conceptual || 0 
        },
        executionTime,
        metadata: {
          model: agent.model,
          provider: 'crewai',
          workflowId: workflow_id,
          sessionId: options.sessionId,
          crewSize: data.crew_size || 1,
          tasksCompleted: data.tasks_completed || 0,
          tokensUsed: data.token_usage || 0,
          crewaiData: data
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ CrewAIAdapter.process FAILED:', {
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
          message: 'Invalid CrewAI configuration',
          error: 'INVALID_CONFIG'
        };
      }

      const { base_url, api_key, workflow_id } = agent.api_config!;
      
      // Endpoint para testar a disponibilidade da crew (baseado na documentação oficial)
      const url = `${base_url}/inputs`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'CrewAI connection successful - inputs available',
          latency,
          details: { 
            status: response.status, 
            workflowId: workflow_id,
            inputs: data.inputs || [],
            crewStatus: 'active'
          }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `CrewAI connection failed: ${response.status}`,
          latency,
          error: errorText
        };
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        message: 'CrewAI connection test failed',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Polling inteligente para aguardar resultado do CrewAI
   * Usa intervalos progressivos: 1s → 2s → 3s → 5s → 10s
   */
  private async pollForResult(baseUrl: string, kickoffId: string, headers: any): Promise<string> {
    const statusUrl = `${baseUrl}/status/${kickoffId}`;
    const maxAttempts = 30; // Aumentar para 30 tentativas
    const intervals = [500, 1000, 2000, 3000, 5000, 8000]; // Mais agressivo no início
    
    console.log('🔄 CrewAI polling started for kickoff:', kickoffId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Calcular intervalo (usar o último se exceder array)
        const intervalIndex = Math.min(attempt, intervals.length - 1);
        const waitTime = intervals[intervalIndex];
        
        // Aguardar antes da tentativa (exceto primeira)
        if (attempt > 0) {
          console.log(`⏰ CrewAI waiting ${waitTime}ms before attempt ${attempt + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Fazer requisição de status
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000) // 10s por requisição
        });
        
        if (!statusResponse.ok) {
          console.warn(`⚠️ CrewAI status check failed (attempt ${attempt + 1}):`, statusResponse.status);
          continue; // Tentar novamente
        }
        
        const statusData = await statusResponse.json();
        
        // Log detalhado da resposta completa para debug
        console.log(`📊 CrewAI status (attempt ${attempt + 1}):`, {
          status: statusData.status,
          hasResult: !!(statusData.result || statusData.output || statusData.response),
          hasError: !!statusData.error_message,
          rawData: statusData // Log completo para debug
        });
        
        // Extrair possíveis resultados
        const possibleResult = statusData.result || statusData.output || statusData.response || statusData.data;
        
        // Verificar status da task - INCLUIR status null com resultado
        if (statusData.status === 'completed' || 
            (statusData.status === null && possibleResult)) {
          
          if (possibleResult) {
            console.log('✅ CrewAI task completed successfully');
            console.log('📋 Result extracted:', typeof possibleResult, possibleResult?.length ? `(${possibleResult.length} chars)` : '');
            return possibleResult;
          } else {
            console.warn('⚠️ CrewAI completed but no result found');
            return 'CrewAI execution completed but no result was returned';
          }
        }
        
        if (statusData.status === 'error' || statusData.status === 'failed') {
          const errorMsg = statusData.error_message || statusData.error || 'Unknown error';
          console.error('❌ CrewAI task failed:', errorMsg);
          throw new Error(`CrewAI execution failed: ${errorMsg}`);
        }
        
        // Status ainda em execução (running, pending, etc.)
        if (statusData.status === 'running' || statusData.status === 'pending' || statusData.status === 'processing') {
          console.log(`🔄 CrewAI still ${statusData.status}, continuing polling...`);
          continue; // Continuar polling
        }
        
        // Status desconhecido mas não é erro - continuar
        console.log(`🤔 CrewAI unknown status: ${statusData.status}, continuing polling...`);
        
      } catch (error) {
        console.error(`❌ CrewAI polling error (attempt ${attempt + 1}):`, error);
        
        // Se for timeout ou rede, continuar tentando
        if (attempt < maxAttempts - 1) {
          continue;
        }
        
        // Última tentativa - lançar erro
        throw new Error(`CrewAI polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Timeout - task não completou no tempo esperado
    console.warn('⏰ CrewAI polling timeout after', maxAttempts, 'attempts');
    console.warn('💡 CrewAI Debug: Task may have completed but status is inconsistent. Try checking the CrewAI dashboard directly.');
    return 'CrewAI task is taking longer than expected. The crew is still working on your request. If this persists, please check your CrewAI dashboard or try again in a few minutes.';
  }

  validateConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    // Campos obrigatórios para CrewAI
    const requiredFields = ['base_url', 'api_key'];
    
    return requiredFields.every(field => {
      const value = apiConfig[field];
      return value && typeof value === 'string' && value.trim().length > 0;
    });
  }

  // Método para gerar configuração exemplo do CrewAI
  static getExampleConfig() {
    return {
      base_url: 'https://your-crew-id.crewai.com',
      api_key: 'your-bearer-token-here',
      workflow_id: 'your-crew-uuid', // Opcional para referência
      server_url: 'https://your-crew-id.crewai.com'
    };
  }

  // Método para detectar se uma configuração é do CrewAI
  static isCrewAIConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    const url = apiConfig.base_url?.toLowerCase() || '';
    const apiKey = apiConfig.api_key?.toLowerCase() || '';
    
    return url.includes('crewai') || url.includes('crew') || apiKey.startsWith('crew-');
  }
}