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
    const endpoint = await this.getEndpoint();
    const requestBody = this.formatRequestBody(options, endpoint);
    
    console.log(`🎯 [UnifiedRAGService] Using endpoint: ${endpoint}`);
    console.log(`📝 [UnifiedRAGService] Query: "${options.message}"`);
    console.log(`🔧 [UnifiedRAGService] Request body:`, requestBody);
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: requestBody
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [UnifiedRAGService] Response received in ${responseTime}ms`);

      if (error) {
        console.error(`❌ [UnifiedRAGService] Error:`, error);
        throw new Error(`RAG system error: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        console.error(`❌ [UnifiedRAGService] Empty response from ${endpoint}`);
        throw new Error('RAG system returned empty response');
      }

      console.log(`✅ [UnifiedRAGService] Response received`);
      console.log(`📊 [UnifiedRAGService] Confidence: ${data.confidence}`);
      console.log(`📝 [UnifiedRAGService] Response preview:`, data.response?.substring(0, 200));
      
      if (data.agentTrace) {
        console.log(`🤖 [UnifiedRAGService] Agent trace: ${data.agentTrace.length} agents`);
        data.agentTrace.forEach((agent: any, i: number) => {
          console.log(`   Agent ${i}: ${agent.type} (confidence: ${agent.confidence}, hasData: ${agent.hasRegimeData || agent.hasRiskData || agent.hasZotData || 'none'})`);
        });
      }

      // Ensure consistent response format
      // CRITICAL: For Dify responses, DO NOT apply templateFilter
      const rawResponse = data.response || data.content || '';
      
      return {
        response: rawResponse, // Return exactly as received - NO FILTERING for Dify
        confidence: data.confidence || 0,
        sources: data.sources || { tabular: 0, conceptual: 0 },
        executionTime: data.executionTime || responseTime,
        agentTrace: data.agentTrace || [],
        metadata: {
          ...data.metadata,
          endpoint,
          model: options.model,
          responseTime,
          isDify: endpoint === 'agentic-rag-dify'
        }
      };
      
    } catch (error) {
      console.error(`❌ [UnifiedRAGService] Failed after ${Date.now() - startTime}ms:`, error);
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