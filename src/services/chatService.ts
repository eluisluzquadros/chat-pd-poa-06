
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { externalAgentGateway } from "@/services/externalAgentGateway";
import { agentsService } from "@/services/agentsService";

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
    usedFallback?: boolean;
    selectedAgent?: {
      id: string;
      name: string;
      provider: string;
      model: string;
    };
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

      console.log('🚀 Starting External Agent processing...');
      console.log('📋 Agent Parameters:', {
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        model: model || 'default',
        sessionId: sessionId || `session_${Date.now()}`,
        userId: finalSession.user.id,
        userRole: userRole || 'citizen'
      });

      // Determinar qual agente usar
      let selectedAgent = null;
      
      if (model) {
        // Se model foi especificado, tentar buscar agente por nome ou modelo
        selectedAgent = await agentsService.getAgentByName(model);
        if (!selectedAgent) {
          // Buscar por modelo nas configurações dos agentes
          const allAgents = await agentsService.getActiveAgents();
          selectedAgent = allAgents.find(agent => agent.model === model);
        }
      }
      
      // Se não encontrou agente específico, usar o padrão
      if (!selectedAgent) {
        selectedAgent = await agentsService.getDefaultAgent();
      }
      
      // Se ainda não tem agente, usar primeiro ativo disponível
      if (!selectedAgent) {
        const activeAgents = await agentsService.getActiveAgents();
        selectedAgent = activeAgents[0];
      }
      
      if (!selectedAgent) {
        throw new Error('No active external agent available');
      }

      console.log('🤖 Selected agent:', {
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        provider: selectedAgent.provider,
        model: selectedAgent.model
      });

      // Processar via External Agent Gateway
      const agentOptions = {
        sessionId: sessionId || `session_${Date.now()}`,
        userId: finalSession.user.id,
        userRole: userRole || 'citizen',
        temperature: selectedAgent.parameters?.temperature,
        maxTokens: selectedAgent.parameters?.max_tokens,
        stream: selectedAgent.parameters?.stream
      };

      const ragResult = await externalAgentGateway.processMessage(
        selectedAgent,
        message,
        agentOptions
      );

      if (!ragResult || !ragResult.response) {
        throw new Error('No response from external agent');
      }

      const executionTime = Date.now() - startTime;
      console.log('✅ ChatService.processMessage COMPLETE:', {
        success: true,
        executionTime,
        hasResponse: !!ragResult.response,
        responseLength: ragResult.response?.length || 0,
        confidence: ragResult.confidence,
        usedFallback: false,
        selectedAgent: selectedAgent.name
      });
      
      return {
        response: ragResult.response,
        confidence: ragResult.confidence || 0.85,
        sources: ragResult.sources || { tabular: 0, conceptual: 0 },
        executionTime: ragResult.executionTime || executionTime,
        usedFallback: false, // Sempre false agora pois usamos agentes externos
        selectedAgent: {
          id: selectedAgent.id,
          name: selectedAgent.name,
          provider: selectedAgent.provider,
          model: selectedAgent.model
        }
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
        } else if (error.message.includes('external agent') || error.message.includes('agent')) {
          console.error('🔍 External Agent Error Details:', {
            userRole,
            message: message.substring(0, 100),
            model,
            suggestedAction: 'Check agent configuration and API keys'
          });
        }
      }
      
      // Rethrow the error to let the caller handle it
      throw error;
    }
  }
}

export const chatService = new ChatService();
