
// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Message, ChatSession } from "@/types/chat";
import { RefetchFunction } from "./types";
import { toast } from "sonner";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";

export function useChatDatabase() {
  const queryClient = useQueryClient();

  // Get user role with better error handling
  const { data: userRole } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      try {
        const session = await getCurrentAuthenticatedSession();
        if (!session?.user) return null;
        
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user role:', error);
          return null;
        }
        
        return roleData?.role;
      } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Load chat sessions with better error handling
  const { data: chatSessions, refetch } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      try {
        const session = await getCurrentAuthenticatedSession();
        if (!session) return [];

        const { data: sessions, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error loading chat sessions:', error);
          return [];
        }

        return sessions as ChatSession[];
      } catch (error) {
        console.error('Error loading chat sessions:', error);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const refetchSessions: RefetchFunction = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    } catch (error) {
      console.error('Error refetching sessions:', error);
      toast.error("Erro ao atualizar sessões de chat");
    }
  };

  // Force cleanup orphaned sessions from cache
  const forceCleanupOrphanedSessions = async () => {
    try {
      const session = await getCurrentAuthenticatedSession();
      if (!session) return;

      // Get fresh data from database
      const { data: freshSessions, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const validSessionIds = new Set(freshSessions?.map(s => s.id) || []);
      
      // Get current cached data
      const cachedSessions = queryClient.getQueryData(['chatSessions']) as ChatSession[] || [];
      
      // Filter out orphaned sessions from cache
      const cleanedSessions = cachedSessions.filter(session => validSessionIds.has(session.id));
      
      // Update cache with cleaned data
      queryClient.setQueryData(['chatSessions'], cleanedSessions);
      
      console.log(`Cleaned ${cachedSessions.length - cleanedSessions.length} orphaned sessions from cache`);
    } catch (error) {
      console.error('Error cleaning orphaned sessions:', error);
    }
  };

  const loadChatHistory = async (sessionId: string): Promise<Message[]> => {
    if (!sessionId) return [];

    try {
      const session = await getCurrentAuthenticatedSession();
      if (!session) return [];

      console.log('Loading chat history for session:', sessionId);

      const { data: history, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return [];
      }

      console.log('Loaded chat history:', history);

      return history.map(msg => ({
        id: msg.id,
        content: typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message),
        role: (typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : 'user') as "user" | "assistant",
        timestamp: new Date(msg.created_at),
        model: typeof msg.message === 'object' && msg.message && 'model' in msg.message ? String(msg.message.model) : undefined,
      }));
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  };

  return {
    userRole,
    chatSessions,
    refetchSessions,
    loadChatHistory,
    forceCleanupOrphanedSessions,
  };
}
