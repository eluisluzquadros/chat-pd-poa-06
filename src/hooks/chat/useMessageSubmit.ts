
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { webhookService } from "@/services/webhookService";

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
}: UseMessageSubmitProps) {
  const { toast } = useToast();

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
        sessionId = await createSession(session.user.id, currentInput, "gpt-4", currentInput);
        setCurrentSessionId(sessionId);
      }

      console.log('Creating user message...');
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: currentInput,
        role: "user",
        timestamp: new Date(),
        model: "webhook",
      };

      addMessage(userMessage);

      console.log('Saving user message to database...');
      const { error: userMessageError } = await supabase
        .from('chat_history')
        .insert({
          message: currentInput,
          role: "user",
          session_id: sessionId,
          user_id: session.user.id,
          model: "webhook",
        });

      if (userMessageError) throw userMessageError;

      // Get user role for webhook context - use user metadata or default
      const userRole = session.user.user_metadata?.role || 'citizen';

      console.log('Calling N8N webhook...');
      const assistantContent = await webhookService.sendMessage(
        currentInput,
        sessionId,
        userRole
      );

      console.log('Webhook response received');

      console.log('Creating assistant message...');
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: assistantContent,
        role: "assistant",
        timestamp: new Date(),
        model: "webhook",
      };

      addMessage(assistantMessage);

      console.log('Saving assistant message to database...');
      const { error: assistantMessageError } = await supabase
        .from('chat_history')
        .insert({
          message: assistantContent,
          role: "assistant",
          session_id: sessionId,
          user_id: session.user.id,
          model: "webhook",
        });

      if (assistantMessageError) throw assistantMessageError;

      await updateSession(sessionId, assistantMessage.content);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setInput(currentInput);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
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
