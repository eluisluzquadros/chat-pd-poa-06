/**
 * Unified RAG Service
 * Ensures consistency between /chat, /admin/quality, and /admin/benchmark
 */

import { supabase } from "@/integrations/supabase/client";
import { getRagEndpoint } from "@/config/rag-config";

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
   * PADRONIZAÇÃO: Força userRole='citizen' e cache habilitado para consistência
   */
  private formatRequestBody(options: RAGRequestOptions, endpoint: string): any {
    const baseBody = {
      message: options.message,
      userRole: 'citizen', // PADRONIZADO: sempre 'citizen' para RAG consistency
      sessionId: options.sessionId || `session-${Date.now()}`,
      userId: options.userId || 'anonymous',
      model: options.model || 'gpt-3.5-turbo', // PADRONIZADO: modelo default unificado
      bypassCache: options.bypassCache === true // PADRONIZADO: cache habilitado por padrão
    };

    // Add fields for new RAG real implementation
    if (endpoint === 'agentic-rag') {
      return {
        ...baseBody,
        query: options.message, // For compatibility
        message: options.message,
        options: {
          useAgenticRAG: true,
          useKnowledgeGraph: true,
          useHierarchicalChunks: true,
          userRole: 'citizen', // PADRONIZADO: sempre 'citizen' para RAG
          userId: options.userId || 'anonymous'
        },
        // Metadata para auditoria (não afeta comportamento RAG)
        originalUserRole: options.userRole || 'user',
        adminContext: options.userRole && ['tester', 'qa-validator', 'admin'].includes(options.userRole)
      };
    }

    // Format for Dify RAG proxy
    if (endpoint === 'agentic-rag-dify') {
      return {
        originalQuery: options.message,
        user_role: 'citizen', // PADRONIZADO: sempre 'citizen' para RAG
        metadata: {
          sessionId: options.sessionId || `session-${Date.now()}`,
          userId: options.userId || 'anonymous',
          model: options.model || 'agentic-rag-v2',
          originalUserRole: options.userRole || 'user',
          adminContext: options.userRole && ['tester', 'qa-validator', 'admin'].includes(options.userRole)
        }
      };
    }

    return baseBody;
  }

  /**
   * Call the RAG system with unified parameters
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