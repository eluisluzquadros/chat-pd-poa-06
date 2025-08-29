
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { unifiedRAGService } from "@/lib/unifiedRAGService";

export class ChatService {
  async processMessage(
    message: string, 
    userRole?: string, 
    sessionId?: string,
    model?: string
  ): Promise<{
    response: string;
    confidence: number;
    sources: { tabular: number; conceptual: number };
    executionTime: number;
  }> {
    try {
      // Double-check authentication state
      console.log('🔍 ChatService - Starting authentication check...');
      
      // First try AuthService directly
      const { AuthService } = await import("@/services/authService");
      const directSession = await AuthService.getCurrentSession();
      console.log('🔍 ChatService - Direct AuthService check:', { 
        hasSession: !!directSession, 
        hasUser: !!directSession?.user,
        userId: directSession?.user?.id,
        isDemoMode: AuthService.isDemoMode()
      });
      
      // Then try via authUtils
      const session = await getCurrentAuthenticatedSession();
      console.log('🔍 ChatService - AuthUtils check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id
      });
      
      // Use the direct session if authUtils fails
      const finalSession = session || directSession;
      
      if (!finalSession?.user) {
        console.error('🔍 ChatService - No valid session found');
        console.error('🔍 ChatService - AuthService health:', AuthService.getAuthHealth());
        throw new Error("User not authenticated");
      }
      
      console.log('🔍 ChatService - Using session for user:', finalSession.user.id);

      console.log('🚀 Starting Agentic RAG processing for message:', message);

      // Use the unified RAG service for consistency
      const ragResult = await unifiedRAGService.callRAG({
        message,
        model: model || 'gpt-3.5-turbo',
        sessionId: sessionId || `session_${Date.now()}`,
        userId: finalSession.user.id,
        userRole: userRole || 'citizen',
        bypassCache: false
      });

      console.log('✅ Agentic RAG completed successfully');
      
      return {
        response: ragResult.response,
        confidence: ragResult.confidence,
        sources: ragResult.sources,
        executionTime: ragResult.executionTime
      };

    } catch (error) {
      console.error('❌ Error in ChatService.processMessage:', error);
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Rethrow the error to let the caller handle it
      throw error;
    }
  }
}

export const chatService = new ChatService();
