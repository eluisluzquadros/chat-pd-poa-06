/**
 * Unified RAG Service
 * Ensures consistency between /chat, /admin/quality, and /admin/benchmark
 */

import { supabase } from "@/integrations/supabase/client";

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
   * Get the current system version (v1 or v2)
   */
  private getSystemVersion(): 'v1' | 'v2' {
    // SEMPRE USAR V2 - Sistema dinâmico sem hardcoding
    localStorage.setItem('useAgenticRAGv2', 'true');
    return 'v2';
  }

  /**
   * Get the appropriate endpoint based on system version
   */
  private getEndpoint(): string {
    const version = this.getSystemVersion();
    return version === 'v2' ? 'agentic-rag-v2' : 'agentic-rag';
  }

  /**
   * Format the request body based on endpoint requirements
   */
  private formatRequestBody(options: RAGRequestOptions, endpoint: string): any {
    const baseBody = {
      message: options.message,
      userRole: options.userRole || 'user',
      sessionId: options.sessionId || `session-${Date.now()}`,
      userId: options.userId || 'anonymous',
      model: options.model || 'gpt-3.5-turbo',
      bypassCache: options.bypassCache !== false
    };

    // Add v2-specific fields if using v2 endpoint
    if (endpoint === 'agentic-rag-v2') {
      return {
        ...baseBody,
        query: options.message, // v2 uses 'query'
        message: options.message, // Also include 'message' for compatibility
        options: {
          useAgenticRAG: true,
          useKnowledgeGraph: true,
          useHierarchicalChunks: true,
          userRole: options.userRole || 'user',
          userId: options.userId || 'anonymous'
        }
      };
    }

    return baseBody;
  }

  /**
   * Call the RAG system with unified parameters
   */
  async callRAG(options: RAGRequestOptions): Promise<any> {
    const endpoint = this.getEndpoint();
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
      return {
        response: data.response || data.content || '',
        confidence: data.confidence || 0,
        sources: data.sources || { tabular: 0, conceptual: 0 },
        executionTime: data.executionTime || responseTime,
        agentTrace: data.agentTrace || [],
        metadata: {
          ...data.metadata,
          endpoint,
          model: options.model,
          responseTime
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
      userId: 'qa-validator',
      userRole: 'tester',
      bypassCache: true
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
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return results;
    }
  }

  /**
   * Get system status and configuration
   */
  getSystemStatus(): {
    version: 'v1' | 'v2';
    endpoint: string;
    features: string[];
  } {
    const version = this.getSystemVersion();
    const endpoint = this.getEndpoint();
    
    return {
      version,
      endpoint,
      features: version === 'v2' ? [
        'Autonomous Agents',
        'Knowledge Graph',
        'Session Memory',
        'Auto-refinement',
        'Hierarchical Chunking'
      ] : [
        'Traditional RAG',
        'Vector Search',
        'SQL Generation'
      ]
    };
  }

  /**
   * Toggle between v1 and v2 systems
   */
  toggleSystem(useV2: boolean): void {
    localStorage.setItem('useAgenticRAGv2', String(useV2));
    console.log(`[UnifiedRAGService] System switched to ${useV2 ? 'v2' : 'v1'}`);
  }
}

// Export singleton instance
export const unifiedRAGService = UnifiedRAGService.getInstance();