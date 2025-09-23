
import { useEffect, useCallback, useState } from "react";
import { useChatDatabase } from "./chat/useChatDatabase";
import { useChatOperations } from "./chat/useChatOperations";
import type { UseChatHookReturn } from "./chat/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";

export function useChat(): UseChatHookReturn {
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  
  const { 
    userRole, 
    chatSessions, 
    refetchSessions,
  } = useChatDatabase();

  const chatOperations = useChatOperations(refetchSessions);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    currentSessionId,
    handleSubmit,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    selectedModel,
    switchModel,
  } = chatOperations;

  // Check for initial query from localStorage
  useEffect(() => {
    try {
      const storedQuery = localStorage.getItem('initialChatQuery');
      if (storedQuery) {
        setInitialQuery(storedQuery);
        setInput(storedQuery);
        localStorage.removeItem('initialChatQuery'); // Clear after retrieving
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, [setInput]);

  // Auto-submit the initial query
  useEffect(() => {
    if (initialQuery && !isLoading && messages.length === 0) {
      try {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
        setInitialQuery(null); // Clear after submission
      } catch (error) {
        console.error("Error auto-submitting query:", error);
        toast.error("Erro ao processar consulta inicial");
      }
    }
  }, [initialQuery, isLoading, messages.length, handleSubmit]);

  const refreshChatHistory = useCallback(async () => {
    if (currentSessionId) {
      try {
        console.log('Refreshing chat history for session:', currentSessionId);
        await handleSelectSession(currentSessionId);
        setIsConnectionError(false);
      } catch (error) {
        console.error("Error refreshing chat history:", error);
        setIsConnectionError(true);
      }
    }
  }, [currentSessionId, handleSelectSession]);

  useEffect(() => {
    let channel: any;
    
    const setupRealtime = async () => {
      try {
        // Check if user is authenticated first
        const session = await getCurrentAuthenticatedSession();
        if (!session?.user) {
          console.log("No authenticated session, skipping real-time setup");
          return;
        }
        
        // Set up real-time subscription
        channel = supabase
          .channel('chat-history-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'chat_history',
              filter: currentSessionId ? `session_id=eq.${currentSessionId}` : undefined,
            },
            async (payload) => {
              console.log('Received real-time update:', payload);
              await refreshChatHistory();
            }
          )
          .subscribe((status: string) => {
            console.log("Subscription status:", status);
          });
      } catch (error) {
        console.error("Error setting up real-time subscription:", error);
      }
    };
    
    setupRealtime();

    return () => {
      console.log('Cleaning up subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentSessionId, refreshChatHistory]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    userRole,
    chatSessions,
    currentSessionId,
    handleSubmit,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    isConnectionError,
    selectedModel,
    switchModel,
  };
}
