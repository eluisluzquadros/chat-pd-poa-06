
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
      console.log(`[DELETE SESSION] Starting atomic deletion for session: ${sessionId}`);
      
      // Use the new atomic SQL function for reliable deletion
      const { data, error } = await supabase.rpc('delete_chat_session_atomic', {
        session_id_param: sessionId
      });

      if (error) {
        console.error('[DELETE SESSION] RPC Error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[DELETE SESSION] Function returned error:', data);
        throw new Error(data?.error || 'Falha na deleção da conversa');
      }

      console.log('[DELETE SESSION] Success:', data);
      
      // Only refetch sessions after confirmed successful deletion
      await refetchSessions();

      if (showToast) {
        toast({
          title: "Sucesso",
          description: data.message || "Conversa excluída com sucesso",
        });
      }
    } catch (error: any) {
      console.error('[DELETE SESSION] Complete error details:', {
        sessionId,
        error: error?.message || error,
        stack: error?.stack
      });
      
      if (showToast) {
        toast({
          title: "Erro",
          description: error?.message || "Falha ao excluir conversa",
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [toast, refetchSessions]);

  const deleteSessions = useCallback(async (sessionIds: string[]) => {
    console.log(`[DELETE SESSIONS] Starting batch deletion for ${sessionIds.length} sessions:`, sessionIds);
    
    const failedDeletions: string[] = [];
    const successResults: any[] = [];
    
    // Process deletions in parallel for better performance
    const deletePromises = sessionIds.map(async (sessionId) => {
      try {
        const { data, error } = await supabase.rpc('delete_chat_session_atomic', {
          session_id_param: sessionId
        });

        if (error) {
          console.error(`[DELETE SESSIONS] RPC Error for ${sessionId}:`, error);
          failedDeletions.push(sessionId);
          return { sessionId, success: false, error };
        }

        if (!data?.success) {
          console.error(`[DELETE SESSIONS] Function error for ${sessionId}:`, data);
          failedDeletions.push(sessionId);
          return { sessionId, success: false, error: data?.error };
        }

        successResults.push(data);
        return { sessionId, success: true, data };
      } catch (error) {
        console.error(`[DELETE SESSIONS] Exception for ${sessionId}:`, error);
        failedDeletions.push(sessionId);
        return { sessionId, success: false, error };
      }
    });

    await Promise.all(deletePromises);

    // Single refetch after all operations
    await refetchSessions();

    // Show consolidated toast
    const successCount = sessionIds.length - failedDeletions.length;
    console.log(`[DELETE SESSIONS] Results: ${successCount} success, ${failedDeletions.length} failed`);
    
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
      throw new Error(`Failed to delete ${failedDeletions.length} sessions: ${failedDeletions.join(', ')}`);
    }
  }, [toast, refetchSessions]);

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
