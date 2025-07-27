
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";

export class ChatService {
  async processMessage(
    message: string, 
    userRole?: string, 
    sessionId?: string
  ): Promise<{
    response: string;
    confidence: number;
    sources: { tabular: number; conceptual: number };
    executionTime: number;
  }> {
    try {
      // Get current authenticated user
      const session = await getCurrentAuthenticatedSession();
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      console.log('🚀 Starting Agentic RAG processing for message:', message);

      // Call the main Agentic RAG orchestrator
      const { data: ragResult, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message,
          userRole: userRole || 'citizen',
          sessionId,
          userId: session.user.id
        }
      });

      if (error) {
        console.error('Agentic RAG error:', error);
        throw new Error(`Agentic RAG processing failed: ${error.message}`);
      }

      console.log('✅ Agentic RAG completed successfully');
      
      return {
        response: ragResult.response,
        confidence: ragResult.confidence,
        sources: ragResult.sources,
        executionTime: ragResult.executionTime
      };

    } catch (error) {
      console.error('Error in ChatService.processMessage:', error);
      
      // Return fallback response for now
      const fallbackResponse = `Olá! Estou processando sua mensagem: "${message}"
      
🤖 **Sistema funcionando!** O chat está ativo e recebendo suas mensagens.

📝 **Funcionalidades em desenvolvimento:**
- Processamento avançado de consultas
- Busca em documentos
- Respostas contextualizadas

💬 **Obrigado pela sua paciência!** Continue testando o sistema.`;

      return {
        response: fallbackResponse,
        confidence: 0.1,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: 0
      };
    }
  }
}

export const chatService = new ChatService();
