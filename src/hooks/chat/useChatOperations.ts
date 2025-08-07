
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
    selectedModel,
    switchModel,
  };
}
