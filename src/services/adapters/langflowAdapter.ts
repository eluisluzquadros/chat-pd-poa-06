import { Agent } from '../agentsService';
import { 
  IExternalAgentAdapter, 
  AgentProcessOptions, 
  AgentProcessResponse, 
  ConnectionTestResult 
} from '../externalAgentGateway';

export class LangflowAdapter implements IExternalAgentAdapter {
  
  async process(
    agent: Agent, 
    message: string, 
    options: AgentProcessOptions = {}
  ): Promise<AgentProcessResponse> {
    const startTime = Date.now();
    
    console.log('🔧 LangflowAdapter.process START:', {
      agentId: agent.id,
      agentName: agent.name,
      messageLength: message.length,
      baseUrl: agent.api_config?.base_url,
      workflowId: agent.api_config?.workflow_id
    });

    try {
      // Validar configuração
      if (!this.validateConfig(agent.api_config)) {
        throw new Error('Invalid Langflow configuration');
      }

      const { base_url, api_key, workflow_id } = agent.api_config!;
      
      // Construir URL do endpoint para Langflow
      const endpoint = `/api/v1/run/${workflow_id}`;
      const url = `${base_url}${endpoint}`;

      // Preparar payload para Langflow
      const payload = {
        input_value: message,
        input_type: 'chat',
        output_type: 'chat',
        tweaks: {
          // Pode incluir tweaks específicos baseados nos parâmetros do agente
          ...(agent.parameters?.temperature && { temperature: agent.parameters.temperature }),
          ...(agent.parameters?.max_tokens && { max_tokens: agent.parameters.max_tokens })
        },
        session_id: options.sessionId || `session_${Date.now()}`,
        stream: options.stream || false
      };

      // Headers para autenticação
      const headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatPD-POA/1.0'
      };

      console.log('📡 LangflowAdapter making request to:', url);

      // Fazer requisição
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.maxTokens || 30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Langflow API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      console.log('✅ LangflowAdapter.process COMPLETE:', {
        agentId: agent.id,
        executionTime,
        hasResponse: !!data.outputs,
        dataKeys: Object.keys(data)
      });

      // Mapear resposta para formato padrão
      // Langflow pode retornar dados em diferentes formatos
      let responseText = '';
      if (data.outputs && Array.isArray(data.outputs)) {
        // Buscar a primeira saída de texto
        const textOutput = data.outputs.find(output => output.type === 'text' || output.results);
        responseText = textOutput?.results || textOutput?.text || JSON.stringify(data.outputs);
      } else if (data.result) {
        responseText = data.result;
      } else if (data.message) {
        responseText = data.message;
      } else {
        responseText = 'No response from Langflow agent';
      }

      return {
        response: responseText,
        confidence: 0.80, // Langflow não retorna confidence, usar valor padrão
        sources: { tabular: 0, conceptual: 0 },
        executionTime,
        metadata: {
          model: agent.model,
          provider: 'langflow',
          workflowId: workflow_id,
          sessionId: options.sessionId,
          tokensUsed: data.token_usage || 0,
          langflowData: data
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ LangflowAdapter.process FAILED:', {
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
          message: 'Invalid Langflow configuration',
          error: 'INVALID_CONFIG'
        };
      }

      const { base_url, api_key, workflow_id } = agent.api_config!;
      
      // Endpoint para testar a disponibilidade do workflow
      const url = `${base_url}/api/v1/flows/${workflow_id}`;
      
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
        return {
          success: true,
          message: 'Langflow connection successful',
          latency,
          details: { status: response.status, workflowId: workflow_id }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Langflow connection failed: ${response.status}`,
          latency,
          error: errorText
        };
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        message: 'Langflow connection test failed',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    // Campos obrigatórios para Langflow
    const requiredFields = ['base_url', 'api_key', 'workflow_id'];
    
    return requiredFields.every(field => {
      const value = apiConfig[field];
      return value && typeof value === 'string' && value.trim().length > 0;
    });
  }

  // Método para gerar configuração exemplo do Langflow
  static getExampleConfig() {
    return {
      base_url: 'https://api.langflow.org',
      api_key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
      workflow_id: 'workflow-uuid-here',
      server_url: 'https://api.langflow.org'
    };
  }

  // Método para detectar se uma configuração é do Langflow
  static isLangflowConfig(apiConfig: any): boolean {
    if (!apiConfig) return false;
    
    const url = apiConfig.base_url?.toLowerCase() || '';
    const hasWorkflowId = !!apiConfig.workflow_id;
    
    return url.includes('langflow') || hasWorkflowId;
  }
}