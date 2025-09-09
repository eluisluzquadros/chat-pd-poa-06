
// @ts-nocheck
import { useCallback } from "react";
import { Message } from "@/types/chat";
import { useMessages } from "./useMessages";
import { useSessionManagement } from "./useSessionManagement";
import { useInputState } from "./useInputState";
import { useMessageSubmit } from "./useMessageSubmit";
import { useSessionHandling } from "./useSessionHandling";
import { useModelSelection } from "./useModelSelection";
import { RefetchFunction } from "./types";

export function useChatOperations(refetchSessions: RefetchFunction) {
  const {
    input,
    setInput,
    isLoading,
    setIsLoading
  } = useInputState();

  const {
    messages,
    loadMessages,
    clearMessages,
    addMessage,
  } = useMessages();

  const {
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    deleteSessions,
    updateSession,
  } = useSessionManagement(refetchSessions);

  const {
    selectedModel,
    switchModel,
  } = useModelSelection();

  const handleNewChat = useCallback(() => {
    clearMessages();
    setInput("");
    setCurrentSessionId(null);
  }, [clearMessages, setCurrentSessionId, setInput]);

  const { handleSubmit } = useMessageSubmit({
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
  });

  const { handleSelectSession, handleDeleteSession } = useSessionHandling({
    currentSessionId,
    setCurrentSessionId,
    clearMessages,
    loadMessages,
    handleNewChat,
    deleteSession,
    setIsLoading,
  });

  const handleDeleteSessions = useCallback(async (sessionIds: string[]) => {
    try {
      setIsLoading(true);
      // Check if current session is in the list to be deleted
      if (sessionIds.includes(currentSessionId!)) {
        handleNewChat();
      }
      await deleteSessions(sessionIds);
    } catch (error) {
      console.error('Error in handleDeleteSessions:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, handleNewChat, deleteSessions, setIsLoading]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    currentSessionId,
    handleSubmit,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    handleDeleteSessions,
    selectedModel,
    switchModel,
  };
}
