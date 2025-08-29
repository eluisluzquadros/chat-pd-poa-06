
import { useCallback } from "react";
import { Message } from "@/types/chat";
import { RefetchFunction } from "./types";

interface UseSessionHandlingProps {
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearMessages: () => void;
  loadMessages: (sessionId: string) => Promise<Message[]>;
  handleNewChat: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
}

export function useSessionHandling({
  currentSessionId,
  setCurrentSessionId,
  clearMessages,
  loadMessages,
  handleNewChat,
  deleteSession,
  setIsLoading,
}: UseSessionHandlingProps) {
  const handleSelectSession = useCallback(async (sessionId: string): Promise<void> => {
    if (currentSessionId === sessionId) return;
    
    try {
      setIsLoading(true);
      clearMessages();
      setCurrentSessionId(sessionId);
      await loadMessages(sessionId);
    } catch (error) {
      console.error('Error in handleSelectSession:', error);
      handleNewChat();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, clearMessages, setCurrentSessionId, loadMessages, handleNewChat, setIsLoading]);

  const handleDeleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setIsLoading(true);
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      await deleteSession(sessionId);
    } catch (error) {
      console.error('Error in handleDeleteSession:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, handleNewChat, deleteSession, setIsLoading]);

  return {
    handleSelectSession,
    handleDeleteSession,
  };
}
