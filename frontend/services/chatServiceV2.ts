/**
 * Chat Service V2 - Integration with Agentic-RAG Pipeline
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChatMessageV2 {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    confidence?: number;
    agents?: string[];
    refined?: boolean;
    pipeline?: string;
    timestamp?: string;
  };
}

export interface ChatResponseV2 {
  response: string;
  confidence: number;
  metadata: {
    agents_used?: string[];
    validation?: any;
    context?: any;
    refined?: boolean;
    pipeline?: string;
    timestamp?: string;
  };
  sources?: {
    tabular?: number;
    conceptual?: number;
    knowledge_graph?: number;
  };
}

class ChatServiceV2 {
  private sessionId: string;
  private useAgenticRAG: boolean = false; // Usando v3 com fallbacks
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Send message to Agentic-RAG v2
   */
  async sendMessage(
    message: string,
    conversationHistory: ChatMessageV2[] = [],
    options: {
      bypassCache?: boolean;
      model?: string;
      useAgenticRAG?: boolean;
    } = {}
  ): Promise<ChatResponseV2> {
    try {
      // Determine which endpoint to use
      const endpoint = this.useAgenticRAG && options.useAgenticRAG !== false
        ? 'agentic-rag-v2'  // New orchestrator-based pipeline
        : 'agentic-rag-v3';     // Original pipeline
      
      console.log(`🎯 Using ${endpoint} pipeline`);
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          query: message,
          sessionId: this.sessionId,
          conversationHistory: conversationHistory.slice(-5), // Last 5 messages for context
          bypassCache: options.bypassCache || false,
          model: options.model || 'gpt-3.5-turbo',
          options: {
            skipRefinement: false,
            timeout: 30000,
            useKnowledgeGraph: true,
            useHierarchicalChunks: true
          }
        }
      });
      
      if (error) {
        console.error('Chat service error:', error);
        throw error;
      }
      
      // Process response
      const response: ChatResponseV2 = {
        response: data.response || 'Desculpe, não consegui processar sua pergunta.',
        confidence: data.confidence || 0,
        metadata: {
          agents_used: data.metadata?.agents_used || [],
          validation: data.metadata?.validation,
          context: data.metadata?.context,
          refined: data.metadata?.refined || false,
          pipeline: data.metadata?.pipeline || endpoint,
          timestamp: data.metadata?.timestamp || new Date().toISOString()
        },
        sources: data.sources
      };
      
      // Log performance metrics
      this.logMetrics(response);
      
      return response;
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Return error response
      return {
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        confidence: 0,
        metadata: {
          pipeline: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Get session history
   */
  async getSessionHistory(limit: number = 10): Promise<ChatMessageV2[]> {
    try {
      // Use chat_history table instead of session_memory
      const { data, error } = await supabase
        .from('chat_history')
        .select('message')
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      const messages: ChatMessageV2[] = [];
      
      (data || []).reverse().forEach(turn => {
        const message = turn.message as any;
        if (message && typeof message === 'object') {
          messages.push({
            role: 'user',
            content: message.user_message || message.content || ''
          });
          messages.push({
            role: 'assistant',
            content: message.assistant_message || message.response || '',
            metadata: message.metadata || {}
          });
        }
      });
      
      return messages;
      
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }
  
  /**
   * Clear session
   */
  clearSession() {
    this.sessionId = this.generateSessionId();
    console.log('🔄 Session cleared, new ID:', this.sessionId);
  }
  
  /**
   * Toggle between pipelines
   */
  togglePipeline(useAgentic: boolean) {
    this.useAgenticRAG = useAgentic;
    console.log(`🔄 Switched to ${useAgentic ? 'Agentic-RAG v2' : 'Original'} pipeline`);
  }
  
  /**
   * Get current pipeline status
   */
  getPipelineStatus() {
    return {
      pipeline: this.useAgenticRAG ? 'agentic-v2' : 'original',
      sessionId: this.sessionId,
      features: {
        multiAgent: this.useAgenticRAG,
        knowledgeGraph: this.useAgenticRAG,
        hierarchicalChunks: this.useAgenticRAG,
        autoRefinement: this.useAgenticRAG,
        sessionMemory: true
      }
    };
  }
  
  /**
   * Log performance metrics
   */
  private logMetrics(response: ChatResponseV2) {
    const metrics = {
      confidence: response.confidence,
      agentCount: response.metadata.agents_used?.length || 0,
      refined: response.metadata.refined || false,
      pipeline: response.metadata.pipeline,
      timestamp: response.metadata.timestamp
    };
    
    console.log('📊 Response Metrics:', metrics);
    
    // Store metrics for analysis (optional)
    if (response.confidence < 0.5) {
      console.warn('⚠️ Low confidence response:', response.confidence);
    }
  }
  
  /**
   * Test specific agent
   */
  async testAgent(
    agentType: 'legal' | 'urban' | 'validator',
    query: string,
    context: any = {}
  ) {
    try {
      const { data, error } = await supabase.functions.invoke(`agent-${agentType}`, {
        body: { query, context }
      });
      
      if (error) throw error;
      
      console.log(`🤖 ${agentType} agent response:`, data);
      return data;
      
    } catch (error) {
      console.error(`Failed to test ${agentType} agent:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const chatServiceV2 = new ChatServiceV2();

// Export class for testing
export default ChatServiceV2;