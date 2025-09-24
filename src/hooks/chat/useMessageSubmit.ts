
// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message, LLMProvider } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { ChatService } from "@/services/chatService";
import { useTokenTracking } from "@/hooks/useTokenTracking";

interface UseMessageSubmitProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  addMessage: (message: Message) => void;
  createSession: (userId: string, title: string, model: string, message: string, agentId?: string) => Promise<string>;
  updateSession: (sessionId: string, lastMessage: string) => Promise<void>;
  selectedModel: string;
  isDomainReady?: boolean; // NOVO: Passado como prop para evitar hook violation
}

export function useMessageSubmit({
  input,
  setInput,
  isLoading,
  setIsLoading,
  currentSessionId,
  setCurrentSessionId,
  addMessage,
  createSession,
  updateSession,
  selectedModel,
  isDomainReady = true, // NOVO: Default true, passado como prop
}: UseMessageSubmitProps) {
  const { toast } = useToast();
  const chatService = new ChatService();
  const { trackTokenUsage, estimateTokens } = useTokenTracking();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // CRÍTICO: Aguardar DomainContext estar ready antes de prosseguir
    if (!isDomainReady) {
      console.log('⏳ [useMessageSubmit] Waiting for DomainContext to be ready...');
      toast({
        title: "Carregando",
        description: "Inicializando sistema, aguarde...",
      });
      return;
    }

    const session = await getCurrentAuthenticatedSession();
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You need to be logged in to send messages",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const currentInput = input;
    setInput("");

    // Get user role for context - declare here for proper scope
    const { AuthService } = await import("@/services/authService");
    let userRole: string = 'user'; // default fallback
    
    try {
      userRole = await AuthService.getUserRole(session.user.id);
      
      // 🔥 NOVO: Determinar agente ANTES de criar sessão
      let selectedAgentId: string | undefined;
      if (!currentSessionId) {
        // Importar agentsService para determinar o agente
        const { agentsService } = await import("@/services/agentsService");
        
        let selectedAgent = null;
        
        if (selectedModel) {
          // Tentar buscar por ID, nome ou modelo (mesma lógica do chatService)
          const allAgents = await agentsService.getAllAgents();
          selectedAgent = allAgents.find(agent => agent.id === selectedModel) ||
                          allAgents.find(agent => agent.name === selectedModel) ||
                          allAgents.find(agent => agent.model === selectedModel);
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
        
        selectedAgentId = selectedAgent?.id;
        console.log('🤖 Agent determined for new session:', {
          agentId: selectedAgentId,
          agentName: selectedAgent?.name,
          model: selectedModel
        });
      }
      
      let sessionId = currentSessionId;
      
      if (!sessionId) {
        sessionId = await createSession(session.user.id, currentInput, selectedModel, currentInput, selectedAgentId);
        setCurrentSessionId(sessionId);
      }

      console.log('Creating user message...');
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: currentInput,
        role: "user",
        timestamp: new Date(),
        model: selectedModel,
      };

      addMessage(userMessage);

      console.log('Saving user message to database...');
      const { error: userMessageError } = await supabase
        .from('chat_history')
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
          message: {
            content: currentInput,
            role: 'user',
            model: selectedModel,
            timestamp: userMessage.timestamp.toISOString()
          },
        });

      if (userMessageError) throw userMessageError;

      // 🔥 NOVO: Incrementar contador para mensagem do usuário
      const { error: userCountError } = await supabase
        .rpc('increment_message_count', { 
          session_id_param: sessionId 
        });
      
      if (userCountError) {
        console.error('Erro ao incrementar contador para mensagem do usuário:', userCountError);
      }

      console.log(`🚀 [useMessageSubmit] Processing message via ${selectedModel}...`);
      console.log('📝 [useMessageSubmit] Message details:', {
        message: currentInput.substring(0, 100) + (currentInput.length > 100 ? '...' : ''),
        model: selectedModel,
        userRole,
        sessionId,
        userId: session.user.id,
        userEmail: session.user.email
      });
      
      console.log('📞 [useMessageSubmit] Calling ChatService.processMessage...');
      
      const result = await chatService.processMessage(
        currentInput, 
        userRole, 
        sessionId, 
        selectedModel
      );

      console.log(`✅ [useMessageSubmit] ${selectedModel} response received:`, {
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0,
        confidence: result.confidence,
        executionTime: result.executionTime
      });
      console.log(`📝 [useMessageSubmit] Response preview:`, result.response?.substring(0, 200));

      console.log('Creating assistant message...');
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: result.response,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel,
      };

      addMessage(assistantMessage);

      console.log('Saving assistant message to database...');
      const { error: assistantMessageError } = await supabase
        .from('chat_history')
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
          message: {
            content: result.response,
            role: 'assistant',
            model: selectedModel,
            timestamp: assistantMessage.timestamp.toISOString(),
            confidence: 0.8,
            sources: [],
            executionTime: 1000
          },
        });

      if (assistantMessageError) throw assistantMessageError;

      // 🔥 NOVO: Incrementar contador para resposta do assistente
      const { error: assistantCountError } = await supabase
        .rpc('increment_message_count', { 
          session_id_param: sessionId 
        });
      
      if (assistantCountError) {
        console.error('Erro ao incrementar contador para resposta do assistente:', assistantCountError);
      }

      await updateSession(sessionId, assistantMessage.content);

      // Track token usage
      try {
        const inputTokens = estimateTokens(currentInput);
        const outputTokens = estimateTokens(result.response);
        
        await trackTokenUsage({
          model: selectedModel,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost: 0, // Will be calculated in the hook
          message_content_preview: currentInput.slice(0, 100),
          session_id: sessionId
        });
      } catch (tokenError) {
        console.error('Error tracking token usage:', tokenError);
      }

    } catch (error) {
      console.error('❌ [useMessageSubmit] Error in handleSubmit:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userRole,
        selectedModel,
        sessionId: currentSessionId,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        messageLength: currentInput.length
      });
      
      setInput(currentInput);
      
      // Enhanced error messaging
      let errorMessage = "Failed to send message";
      if (error instanceof Error) {
        if (error.message.includes('User not authenticated')) {
          errorMessage = "Authentication failed. Please refresh and try again.";
        } else if (error.message.includes('RAG system')) {
          errorMessage = "AI service temporarily unavailable. Please try again.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Also add error message to chat for debugging
      if (process.env.NODE_ENV === 'development') {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          content: `❌ Debug Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: "assistant",
          timestamp: new Date(),
          model: selectedModel,
        };
        addMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSessionId,
    input,
    isLoading,
    isDomainReady,
    toast,
    addMessage,
    createSession,
    updateSession,
    setCurrentSessionId,
    setInput,
    setIsLoading,
    selectedModel,
  ]);

  return { handleSubmit };
}
