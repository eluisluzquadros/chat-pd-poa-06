
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
    const startTime = Date.now();
    console.log('🔧 ChatService.processMessage START:', {
      messageLength: message.length,
      userRole,
      sessionId,
      model,
      timestamp: new Date().toISOString()
    });

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
        userRole,
        isDemoMode: AuthService.isDemoMode()
      });
      
      // Then try via authUtils
      const session = await getCurrentAuthenticatedSession();
      console.log('🔍 ChatService - AuthUtils check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userRole
      });
      
      // Use the direct session if authUtils fails
      const finalSession = session || directSession;
      
      if (!finalSession?.user) {
        console.error('❌ ChatService - Authentication failed');
        console.error('🔍 ChatService - AuthService health:', AuthService.getAuthHealth());
        console.error('🔍 ChatService - Input parameters:', { userRole, sessionId, model });
        throw new Error("User not authenticated");
      }
      
      console.log('✅ ChatService - Authentication successful:', {
        userId: finalSession.user.id,
        email: finalSession.user.email,
        userRole,
        sessionId
      });

      console.log('🚀 Starting Agentic RAG processing...');
      console.log('📋 RAG Parameters:', {
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        model: model || 'gpt-3.5-turbo',
        sessionId: sessionId || `session_${Date.now()}`,
        userId: finalSession.user.id,
        userRole: userRole || 'citizen'
      });

      // Use the unified RAG service for consistency
      const ragResult = await unifiedRAGService.callRAG({
        message,
        model: model || 'gpt-3.5-turbo',
        sessionId: sessionId || `session_${Date.now()}`,
        userId: finalSession.user.id,
        userRole: userRole || 'citizen',
        bypassCache: false
      });

      const executionTime = Date.now() - startTime;
      console.log('✅ ChatService.processMessage COMPLETE:', {
        success: true,
        executionTime,
        hasResponse: !!ragResult.response,
        responseLength: ragResult.response?.length || 0,
        confidence: ragResult.confidence
      });
      
      return {
        response: ragResult.response,
        confidence: ragResult.confidence,
        sources: ragResult.sources,
        executionTime: ragResult.executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ ChatService.processMessage FAILED:', {
        executionTime,
        userRole,
        sessionId,
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Enhanced error context for debugging
      if (error instanceof Error) {
        if (error.message.includes('User not authenticated')) {
          console.error('🔍 Authentication Error Details:', {
            userRole,
            sessionId,
            model,
            suggestedAction: 'Check user session and authentication state'
          });
        } else if (error.message.includes('RAG system')) {
          console.error('🔍 RAG System Error Details:', {
            userRole,
            message: message.substring(0, 100),
            model,
            suggestedAction: 'Check RAG endpoint and API keys'
          });
        }
      }
      
      // Rethrow the error to let the caller handle it
      throw error;
    }
  }
}

export const chatService = new ChatService();
