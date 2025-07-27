
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
      
      // Return fallback PDUS response
      const fallbackResponse = `Desculpe, sou uma versão Beta e ainda não consigo responder a essa pergunta.

📍 **Explore mais:**
- [Mapa Interativo PDUS](https://bit.ly/3ILdXRA)
- [Contribua com sugestões](https://bit.ly/4oefZKm)
- [Audiência Pública](https://bit.ly/4o7AWqb)

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br

💬 **Sua pergunta é importante!** Considere enviá-la pelos canais oficiais para contribuir com o aperfeiçoamento do plano.`;

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
