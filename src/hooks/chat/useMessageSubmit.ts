
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
  createSession: (userId: string, title: string, model: string, message: string) => Promise<string>;
  updateSession: (sessionId: string, lastMessage: string) => Promise<void>;
  selectedModel: string;
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
}: UseMessageSubmitProps) {
  const { toast } = useToast();
  const chatService = new ChatService();
  const { trackTokenUsage, estimateTokens } = useTokenTracking();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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

    try {
      let sessionId = currentSessionId;
      
      if (!sessionId) {
        sessionId = await createSession(session.user.id, currentInput, selectedModel, currentInput);
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

      // Get user role for context using AuthService cache
      const { AuthService } = await import("@/services/authService");
      const userRole = await AuthService.getUserRole(session.user.id);

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
      const result = await chatService.processMessage(currentInput, userRole, sessionId, selectedModel);

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
        sessionId,
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
    toast,
    addMessage,
    createSession,
    updateSession,
    setCurrentSessionId,
    setInput,
    setIsLoading,
  ]);

  return { handleSubmit };
}
