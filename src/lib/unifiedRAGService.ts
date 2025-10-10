/**
 * Unified RAG Service
 * Ensures consistency between /chat, /admin/observatory, and /admin/benchmark
 */

import { supabase } from "@/integrations/supabase/client";
import { getRagEndpoint } from "@/config/rag-config";
import { externalAgentGateway } from "@/services/externalAgentGateway";
import { agentsService } from "@/services/agentsService";

export interface RAGRequestOptions {
  message: string;
  model?: string;
  sessionId?: string;
  userId?: string;
  userRole?: string;
  bypassCache?: boolean;
}

export class UnifiedRAGService {
  private static instance: UnifiedRAGService;
  
  static getInstance(): UnifiedRAGService {
    if (!UnifiedRAGService.instance) {
      UnifiedRAGService.instance = new UnifiedRAGService();
    }
    return UnifiedRAGService.instance;
  }

  /**
   * Get the endpoint - use Dify or local RAG based on configuration
   */
  private async getEndpoint(): Promise<string> {
    return await getRagEndpoint();
  }

  /**
   * Format the request body based on endpoint requirements
   * CORREÇÃO: Respeita userRole original para admin test mode
   */
  private formatRequestBody(options: RAGRequestOptions, endpoint: string): any {
    const baseBody = {
      message: options.message,
      userRole: options.userRole || 'citizen', // CORRIGIDO: respeita userRole original
      sessionId: options.sessionId || `session-${Date.now()}`,
      userId: options.userId || 'anonymous',
      model: options.model || 'gpt-3.5-turbo',
      bypassCache: options.bypassCache === true
    };

    // Legacy edge functions podem precisar de formato específico
    if (['chat', 'test-connection', 'test-rag-config'].includes(endpoint)) {
      return {
        ...baseBody,
        query: options.message, // For compatibility
        message: options.message,
        options: {
          userRole: options.userRole || 'citizen',
          userId: options.userId || 'anonymous'
        }
      };
    }

    return baseBody;
  }

  /**
   * Persist external agent execution to Supabase for Quality/Benchmark tracking
   */
  private async persistExternalAgentExecution(data: {
    agentId: string;
    agentName: string;
    platform: string;
    message: string;
    response: string;
    confidence: number;
    executionTime: number;
    userId?: string;
    sessionId?: string;
    userRole?: string;
  }): Promise<void> {
    try {
      console.log(`💾 [UnifiedRAGService] Persisting external agent execution...`);
      
      // Usar estrutura da tabela agent_executions existente
      const { error } = await supabase
        .from('agent_executions')
        .insert({
          agent_type: `${data.platform}_external`,
          user_id: data.userId || 'anonymous',
          session_id: data.sessionId,
          execution_time_ms: data.executionTime,
          status: 'completed',
          input_data: {
            message: data.message,
            agentId: data.agentId,
            agentName: data.agentName,
            platform: data.platform,
            userRole: data.userRole
          },
          output_data: {
            response: data.response,
            confidence: data.confidence,
            isExternalAgent: true,
            source: 'external_agent_gateway'
          }
        });

      if (error) {
        console.warn(`⚠️ [UnifiedRAGService] Failed to persist execution (likely RLS):`, error);
        // Não bloquear por falha na persistência - Quality/Benchmark ainda funcionarão
      } else {
        console.log(`✅ [UnifiedRAGService] External agent execution persisted successfully`);
      }
    } catch (error) {
      console.warn(`⚠️ [UnifiedRAGService] Error persisting external agent execution:`, error);
      // Não bloquear execução por falha na persistência
    }
  }

  /**
   * Call external agents through the External Agent Gateway
   */
  async callExternalAgent(options: RAGRequestOptions): Promise<any> {
    const requestId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🌐 [UnifiedRAGService] Starting external agent call - ID: ${requestId}`);
    
    try {
      // Buscar agente por modelo especificado ou usar o padrão
      let selectedAgent = null;
      
      if (options.model) {
        const allAgents = await agentsService.getActiveAgents();
        selectedAgent = allAgents.find(agent => 
          agent.id === options.model || 
          agent.name === options.model || 
          agent.model === options.model
        );
      }
      
      if (!selectedAgent) {
        selectedAgent = await agentsService.getDefaultAgent();
      }
      
      if (!selectedAgent) {
        throw new Error('Nenhum agente externo disponível');
      }
      
      console.log(`🤖 [UnifiedRAGService] Using agent: ${selectedAgent.display_name} (${selectedAgent.provider})`);
      
      let result: any;

      // 🚀 BYPASS: Agentes Lovable usam novo sistema de adapters (Edge Functions)
      if (selectedAgent.provider === 'lovable') {
        console.log('🚀 [UnifiedRAGService] Using Lovable Native Adapter');
        
        const { getAdapterForAgent } = await import('@/services/adapters');
        const adapter = getAdapterForAgent(selectedAgent.provider);
        
        const startTime = Date.now();
        const adapterResult = await adapter.process(options.message, {
          sessionId: options.sessionId || `session-${Date.now()}`,
          userId: options.userId || 'anonymous',
          agentConfig: selectedAgent
        });
        
        // Converter para formato esperado pelo UnifiedRAGService
        result = {
          response: adapterResult.content,
          confidence: 0.95,
          executionTime: Date.now() - startTime,
          metadata: adapterResult.metadata,
          sources: { tabular: [], conceptual: [] }
        };
      } else {
        // Outros providers (Dify, Langflow, CrewAI) usam ExternalAgentGateway
        console.log('🔌 [UnifiedRAGService] Using ExternalAgentGateway');
        
        result = await externalAgentGateway.processMessage(
          selectedAgent,
          options.message,
          {
            sessionId: options.sessionId || `session-${Date.now()}`,
            userId: options.userId || 'anonymous',
            userRole: options.userRole || 'citizen'
          }
        );
      }
      
      console.log(`✅ [UnifiedRAGService] External agent response received`);
      
      // Converter sources para formato esperado pelo legacy
      const legacySources = Array.isArray(result.sources) 
        ? { tabular: result.sources, conceptual: result.sources }
        : result.sources || { tabular: [], conceptual: [] };
      
      // Criar resposta no formato esperado
      const legacyResponse = {
        response: result.response,
        confidence: result.confidence || 0.8,
        executionTime: result.executionTime || 0,
        sources: legacySources,
        selectedAgent: selectedAgent.display_name,
        agentTrace: [{
          type: selectedAgent.provider,
          confidence: result.confidence || 0.8,
          executionTime: result.executionTime || 0
        }],
        // Metadados para compatibilidade
        metadata: {
          ...result.metadata,
          isExternalAgent: true,
          platform: selectedAgent.provider,
          agentId: selectedAgent.id
        }
      };
      
      // 🔄 PERSISTIR NO SUPABASE (manter compatibilidade com Quality/Benchmark)
      try {
        await this.persistExternalAgentExecution({
          agentId: selectedAgent.id,
          agentName: selectedAgent.display_name,
          platform: selectedAgent.provider,
          message: options.message,
          response: result.response,
          confidence: result.confidence || 0.8,
          executionTime: result.executionTime || 0,
          userId: options.userId,
          sessionId: options.sessionId,
          userRole: options.userRole
        });
        console.log(`💾 [UnifiedRAGService] External agent execution persisted to Supabase`);
      } catch (persistError) {
        console.warn(`⚠️ [UnifiedRAGService] Failed to persist external agent execution:`, persistError);
        // Não bloquear a resposta por falha na persistência
      }
      
      return legacyResponse;
      
    } catch (error) {
      console.error(`❌ [UnifiedRAGService] External agent error:`, error);
      throw error;
    }
  }

  /**
   * Call the RAG system with unified parameters
   * Now checks for external agents first, fallback to legacy
   */
  async callRAG(options: RAGRequestOptions): Promise<any> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔄 [UnifiedRAGService] Starting callRAG - ID: ${requestId}`);
    console.log(`👤 [UnifiedRAGService] User context:`, {
      userId: options.userId,
      userRole: options.userRole,
      sessionId: options.sessionId,
      model: options.model
    });
    
    const endpoint = await this.getEndpoint();
    const requestBody = this.formatRequestBody(options, endpoint);
    
    console.log(`🎯 [UnifiedRAGService] Using endpoint: ${endpoint}`);
    console.log(`📝 [UnifiedRAGService] Query: "${options.message}"`);
    console.log(`🔧 [UnifiedRAGService] Request body:`, requestBody);
    
    // Primeiro tentar usar agentes externos se disponíveis
    try {
      console.log(`🔍 [UnifiedRAGService] Checking for external agents...`);
      const activeAgents = await agentsService.getActiveAgents();
      
      if (activeAgents.length > 0) {
        console.log(`🌐 [UnifiedRAGService] Found ${activeAgents.length} external agents, using External Agent Gateway`);
        return await this.callExternalAgent(options);
      } else {
        console.log(`📡 [UnifiedRAGService] No external agents found, using legacy edge functions`);
      }
    } catch (externalError) {
      console.warn(`⚠️ [UnifiedRAGService] External agent failed, fallback to legacy:`, externalError);
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`📡 [UnifiedRAGService] Calling supabase.functions.invoke...`);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: requestBody
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [UnifiedRAGService] Response received in ${responseTime}ms`);
      console.log(`🔍 [UnifiedRAGService] Raw response structure:`, {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : null,
        errorDetails: error
      });

      if (error) {
        console.error(`❌ [UnifiedRAGService] Supabase function error:`, error);
        console.error(`🔍 [UnifiedRAGService] Error context:`, {
          requestId,
          endpoint,
          userRole: options.userRole,
          userId: options.userId,
          errorType: typeof error,
          errorMessage: error.message || 'No message'
        });
        throw new Error(`RAG system error: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        console.error(`❌ [UnifiedRAGService] Empty response from ${endpoint}`);
        console.error(`🔍 [UnifiedRAGService] Empty response context:`, {
          requestId,
          endpoint,
          userRole: options.userRole,
          userId: options.userId,
          requestBody
        });
        throw new Error('RAG system returned empty response');
      }

      console.log(`✅ [UnifiedRAGService] Response received successfully`);
      console.log(`📊 [UnifiedRAGService] Response metrics:`, {
        requestId,
        confidence: data.confidence,
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        hasSources: !!data.sources,
        hasAgentTrace: !!data.agentTrace
      });
      console.log(`📝 [UnifiedRAGService] Response preview:`, data.response?.substring(0, 200));
      
      // Handle agent trace (defensive check)
      if (data.agentTrace && Array.isArray(data.agentTrace)) {
        console.log(`🤖 [UnifiedRAGService] Agent trace: ${data.agentTrace.length} agents`);
        data.agentTrace.forEach((agent: any, i: number) => {
          console.log(`   Agent ${i}: ${agent.type} (confidence: ${agent.confidence}, hasData: ${agent.hasRegimeData || agent.hasRiskData || agent.hasZotData || 'none'})`);
        });
      } else {
        console.log(`🤖 [UnifiedRAGService] Agent trace: ${data.agentTrace ? 'invalid format' : 'undefined'} agents`);
      }

      // Ensure consistent response format
      const rawResponse = data.response || data.content || '';
      
      const finalResult = {
        response: rawResponse,
        confidence: data.confidence || 0,
        sources: data.sources || { tabular: 0, conceptual: 0 },
        executionTime: data.executionTime || responseTime,
        agentTrace: data.agentTrace || [],
        metadata: {
          ...data.metadata,
          endpoint,
          model: options.model,
          responseTime,
          requestId,
          isDify: endpoint === 'agentic-rag-dify'
        }
      };

      console.log(`🎉 [UnifiedRAGService] callRAG completed successfully:`, {
        requestId,
        hasValidResponse: !!finalResult.response,
        confidence: finalResult.confidence
      });
      
      return finalResult;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [UnifiedRAGService] callRAG failed after ${responseTime}ms:`, {
        requestId,
        endpoint,
        userRole: options.userRole,
        userId: options.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Enhanced error context
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          console.error(`🔍 [UnifiedRAGService] Network/Fetch error - check edge function status`);
        } else if (error.message.includes('auth')) {
          console.error(`🔍 [UnifiedRAGService] Authentication error - check user permissions for edge functions`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Test a single query (for QA validation)
   */
  async testQuery(
    question: string, 
    model: string = 'gpt-3.5-turbo',
    sessionId?: string
  ): Promise<any> {
    return this.callRAG({
      message: question,
      model,
      sessionId: sessionId || `qa-test-${Date.now()}`,
      userId: 'qa-validator', // Para auditoria
      userRole: 'tester', // Para auditoria (será convertido para 'citizen' internamente)
      bypassCache: false // PADRONIZADO: usar cache por padrão
    });
  }

  /**
   * Benchmark a model with multiple queries
   */
  async benchmarkModel(
    model: string,
    queries: string[],
    options?: { 
      sessionId?: string;
      parallel?: boolean;
    }
  ): Promise<any[]> {
    const sessionId = options?.sessionId || `benchmark-${Date.now()}`;
    
    if (options?.parallel) {
      // Parallel execution for speed
      const promises = queries.map(query => 
        this.testQuery(query, model, sessionId)
      );
      return Promise.all(promises);
    } else {
      // Sequential execution to avoid rate limiting
      const results = [];
      for (const query of queries) {
        const result = await this.testQuery(query, model, sessionId);
        results.push(result);
        // Small delay between queries (reduzido para performance)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return results;
    }
  }

  /**
   * Get system status and configuration
   */
  async getSystemStatus(): Promise<{
    version: string;
    endpoint: string;
    features: string[];
  }> {
    const endpoint = await this.getEndpoint();
    
    return {
      version: 'unified',
      endpoint,
      features: [
        'Multi-LLM Support (21 models)',
        'Legal Articles Database (654 docs)',
        'Regime Urbanístico Consolidado',
        'Vector Search with Embeddings',
        'Hierarchical Document Processing',
        'Auto-refinement',
        'Session Memory',
        'Padronized Responses (userRole=citizen)',
        'Unified Cache Strategy'
      ]
    };
  }
}

// Export singleton instance
export const unifiedRAGService = UnifiedRAGService.getInstance();