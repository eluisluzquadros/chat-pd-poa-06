
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefetchFunction } from "./types";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";

export function useSessionManagement(refetchSessions: RefetchFunction) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const createSession = useCallback(async (userId: string, title: string, model: string, message: string) => {
    const session = await getCurrentAuthenticatedSession();
    if (!session?.user) throw new Error("User not authenticated");
    
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: session.user.id,
        title: title.slice(0, 50),
        model,
        last_message: message,
      })
      .select()
      .single();

    if (error) throw error;
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error: deleteHistoryError } = await supabase
        .from('chat_history')
        .delete()
        .eq('session_id', sessionId);

      if (deleteHistoryError) throw deleteHistoryError;

      const { error: deleteSessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteSessionError) throw deleteSessionError;

      await refetchSessions();
      
      toast({
        title: "Sucesso",
        description: "Conversa excluída com sucesso",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir conversa",
        variant: "destructive",
      });
      throw error;
    }
  }, [refetchSessions, toast]);

  const updateSession = useCallback(async (sessionId: string, lastMessage: string) => {
    try {
      await supabase
        .from('chat_sessions')
        .update({ 
          last_message: lastMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      await refetchSessions();
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }, [refetchSessions]);

  return {
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    updateSession,
  };
}
