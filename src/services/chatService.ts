
import { supabase } from "@/integrations/supabase/client";
import type { AgentMessage, AgentState, EmbeddingSearchResult } from "@/types/agents";

export class ChatService {
  private async getDocumentContext(query: string, userRole: AgentState['userRole']): Promise<string[]> {
    try {
      // Get embedding for query
      const { data: queryEmbedding } = await supabase.functions.invoke('generate-embedding', {
        body: { text: query }
      });

      // Get relevant documents based on user role
      const { data: documents } = await supabase
        .from('documents_test')
        .select('id')
        .eq('is_default', userRole === 'citizen');

      if (!documents?.length) return [];

      const documentIds = documents.map(doc => doc.id.toString());

      // Search for relevant content using the match_documents function
      const { data: matches } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_count: 5,
        document_ids: documentIds
      });

      return (matches as any[])?.map(match => match.content_chunk || match.content) || [];
    } catch (error) {
      console.error('Error getting document context:', error);
      return [];
    }
  }

  async processMessage(message: string, state: AgentState): Promise<AgentState> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Start with reasoning agent to determine approach
      const reasoningResponse = await supabase.functions.invoke('agent-reasoning', {
        body: {
          message,
          userRole: state.userRole,
          context: state.context
        }
      });

      // Get relevant document context
      const context = await this.getDocumentContext(message, state.userRole);
      
      // Use RAG agent to generate response
      const ragResponse = await supabase.functions.invoke('agent-rag', {
        body: {
          message,
          context,
          reasoningOutput: reasoningResponse.data
        }
      });

      // Use evaluation agent to assess response
      const evaluationResponse = await supabase.functions.invoke('agent-evaluation', {
        body: {
          originalMessage: message,
          response: ragResponse.data,
          context
        }
      });

      // Store conversation in history
      await supabase.from('chat_history').insert({
        user_id: user.id,
        role: 'user',
        message,
        model: 'gpt-4-turbo',
        session_id: state.currentSessionId
      });

      return {
        ...state,
        messages: [
          ...state.messages,
          { role: 'user', content: message },
          { role: 'assistant', content: ragResponse.data.response }
        ],
        context,
        evaluation: evaluationResponse.data
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
