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
        signal: AbortSignal.timeout(options.maxTokens || 45000) // CrewAI pode demorar mais por usar múltiplos agentes
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
      
      if (data.kickoff_id) {
        // Se recebeu kickoff_id, buscar o resultado
        const statusUrl = `${base_url}/status/${data.kickoff_id}`;
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(60000) // Aguardar até 60s pelo resultado
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // Aguardar conclusão se ainda está executando
          if (statusData.status === 'running' || statusData.status === 'pending') {
            // Polling simples - aguardar algumas tentativas
            for (let attempts = 0; attempts < 12; attempts++) {
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5s entre tentativas
              
              const retryResponse = await fetch(statusUrl, { method: 'GET', headers });
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.status === 'completed') {
                  responseText = retryData.result || retryData.output || 'CrewAI execution completed';
                  break;
                } else if (retryData.status === 'error') {
                  throw new Error(`CrewAI execution failed: ${retryData.error_message || 'Unknown error'}`);
                }
              }
            }
            
            if (!responseText) {
              responseText = 'CrewAI execution is taking longer than expected. Please check status later.';
            }
          } else if (statusData.status === 'completed') {
            responseText = statusData.result || statusData.output || 'CrewAI execution completed';
          } else if (statusData.status === 'error') {
            throw new Error(`CrewAI execution failed: ${statusData.error_message || 'Unknown error'}`);
          } else {
            responseText = `CrewAI status: ${statusData.status}`;
          }
        } else {
          responseText = `CrewAI kickoff started (ID: ${data.kickoff_id}) but status check failed`;
        }
      } else if (data.output || data.result) {
        // Resposta direta (caso não seja async)
        responseText = data.output || data.result;
      } else {
        responseText = 'No response from CrewAI agents';
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