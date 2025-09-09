
// @ts-nocheck
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

  const deleteSession = useCallback(async (sessionId: string, showToast: boolean = true) => {
    try {
      // Delete token usage first (if it exists)
      const { error: tokenError } = await supabase
        .from('qa_token_usage')
        .delete()
        .eq('validation_run_id', sessionId);

      // Don't throw on token error as this table might not have records
      if (tokenError) console.warn('Token deletion warning:', tokenError);

      // Delete chat history second (child records)
      const { error: historyError } = await supabase
        .from('chat_history')
        .delete()
        .eq('session_id', sessionId);

      if (historyError) throw historyError;

      // Then delete the chat session (parent record)
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      if (showToast) {
        toast({
          title: "Sucesso",
          description: "Conversa excluída com sucesso",
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      if (showToast) {
        toast({
          title: "Erro",
          description: "Falha ao excluir conversa",
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [toast]);

  const deleteSessions = useCallback(async (sessionIds: string[]) => {
    const failedDeletions: string[] = [];
    
    for (const sessionId of sessionIds) {
      try {
        await deleteSession(sessionId, false); // Don't show individual toasts
      } catch (error) {
        failedDeletions.push(sessionId);
      }
    }

    // Single refetch after all operations
    await refetchSessions();

    // Show consolidated toast
    const successCount = sessionIds.length - failedDeletions.length;
    if (successCount > 0 && failedDeletions.length === 0) {
      toast({
        title: "Sucesso",
        description: `${successCount} conversa(s) excluída(s) com sucesso`,
      });
    } else if (successCount > 0 && failedDeletions.length > 0) {
      toast({
        title: "Parcialmente concluído",
        description: `${successCount} conversa(s) excluída(s). ${failedDeletions.length} falharam.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível excluir nenhuma conversa",
        variant: "destructive",
      });
    }

    if (failedDeletions.length > 0) {
      throw new Error(`Failed to delete ${failedDeletions.length} sessions`);
    }
  }, [deleteSession, refetchSessions, toast]);

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
    deleteSessions,
    updateSession,
  };
}
