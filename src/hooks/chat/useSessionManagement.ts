
// @ts-nocheck
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefetchFunction } from "./types";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { useQueryClient } from "@tanstack/react-query";
import { ChatSession } from "@/types/chat";

export function useSessionManagement(refetchSessions: RefetchFunction) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para validar UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const createSession = useCallback(async (userId: string, title: string, model: string, message: string, agentId?: string) => {
    const session = await getCurrentAuthenticatedSession();
    if (!session?.user) throw new Error("User not authenticated");
    
    // Criar sessão no chat_sessions
    // WORKAROUND: Remover agent_id temporariamente devido a cache do PostgREST
    const sessionData: any = {
      user_id: session.user.id,
      title: title.slice(0, 50),
      model,
      last_message: message,
    };
    
    // Tentar incluir agent_id se o cache permitir
    try {
      if (agentId) {
        sessionData.agent_id = agentId;
      }
    } catch (e) {
      console.warn('⚠️ [createSession] Skipping agent_id due to cache issue');
    }
    
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    // ✅ OTIMIZADO: chat_sessions já contém agent_id para rastreamento
    // Não precisamos mais de registro duplicado em conversations
    console.log('✅ Sessão criada com rastreamento de agente:', { 
      sessionId: newSession.id, 
      agentId: agentId || 'null',
      userId: session.user.id 
    });

    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, []);

  const deleteSession = useCallback(async (sessionId: string, showToast: boolean = true) => {
    try {
      console.log(`🔍 [DELETE SESSION] Iniciando exclusão para: ${sessionId}`);
      console.log(`🔍 [DELETE SESSION] Tipo: ${typeof sessionId}, Tamanho: ${sessionId.length}`);
      
      // Validar se o sessionId é um UUID válido
      if (!isValidUUID(sessionId)) {
        console.error(`❌ [DELETE SESSION] ID inválido detectado: ${sessionId}`);
        
        // Remover diretamente do cache local se ID for inválido
        const cachedSessions = queryClient.getQueryData(['chatSessions']) as ChatSession[] || [];
        const updatedSessions = cachedSessions.filter(session => session.id !== sessionId);
        queryClient.setQueryData(['chatSessions'], updatedSessions);
        
        // Limpar sessão atual se for a inválida
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
        }
        
        // Forçar refetch para sincronizar com o banco
        await refetchSessions();
        
        if (showToast) {
          toast({
            title: "Sessão removida",
            description: "Sessão com ID inválido foi removida da interface.",
            variant: "destructive"
          });
        }
        
        console.log(`✅ [DELETE SESSION] ID inválido removido do cache: ${sessionId}`);
        return;
      }

      console.log(`✅ [DELETE SESSION] UUID válido, prosseguindo com exclusão no banco`);
      
      // Use the new atomic SQL function for reliable deletion
      const { data, error } = await supabase.rpc('delete_chat_session_atomic', {
        session_id_param: sessionId
      });

      if (error) {
        console.error(`❌ [DELETE SESSION] RPC Error:`, error);
        throw error;
      }

      if (!data?.success) {
        console.error(`❌ [DELETE SESSION] Function returned error:`, data);
        throw new Error(data?.error || 'Falha na deleção da conversa');
      }

      console.log(`✅ [DELETE SESSION] Success:`, data);
      
      // Clear current session if it was deleted
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }

      // Forçar invalidação completa das queries para garantir atualização
      queryClient.invalidateQueries(['chatSessions']);
      
      // Forçar refetch para garantir sincronização
      await refetchSessions();
      console.log('🔄 Cache invalidado e sessões recarregadas após exclusão');

      if (showToast) {
        toast({
          title: "Sucesso",
          description: data.message || "Conversa excluída com sucesso",
        });
      }
    } catch (error: any) {
      console.error(`❌ [DELETE SESSION] Complete error details:`, {
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
  }, [toast, currentSessionId, queryClient, refetchSessions]);

  const deleteSessions = useCallback(async (sessionIds: string[]) => {
    console.log(`🔍 [DELETE SESSIONS] Iniciando exclusão em lote para ${sessionIds.length} sessões:`, sessionIds);
    
    // Separar IDs válidos dos inválidos
    const validIds: string[] = [];
    const invalidIds: string[] = [];
    
    sessionIds.forEach(id => {
      console.log(`🔍 [DELETE SESSIONS] Verificando ID: ${id} (tipo: ${typeof id}, tamanho: ${id.length})`);
      if (isValidUUID(id)) {
        validIds.push(id);
        console.log(`✅ [DELETE SESSIONS] ID válido: ${id}`);
      } else {
        invalidIds.push(id);
        console.error(`❌ [DELETE SESSIONS] ID inválido: ${id}`);
      }
    });
    
    // Limpar IDs inválidos do cache imediatamente
    if (invalidIds.length > 0) {
      console.log(`🧹 [DELETE SESSIONS] Limpando ${invalidIds.length} IDs inválidos do cache:`, invalidIds);
      const cachedSessions = queryClient.getQueryData(['chatSessions']) as ChatSession[] || [];
      const cleanedSessions = cachedSessions.filter(session => !invalidIds.includes(session.id));
      queryClient.setQueryData(['chatSessions'], cleanedSessions);
      
      // Limpar sessão atual se for inválida
      if (currentSessionId && invalidIds.includes(currentSessionId)) {
        setCurrentSessionId(null);
        console.log(`🧹 [DELETE SESSIONS] Sessão atual inválida removida: ${currentSessionId}`);
      }
    }
    
    const failedDeletions: string[] = [];
    const successResults: any[] = [];
    
    // Processar apenas IDs válidos
    if (validIds.length > 0) {
      console.log(`✅ [DELETE SESSIONS] Processando ${validIds.length} IDs válidos:`, validIds);
      
      const deletePromises = validIds.map(async (sessionId) => {
        try {
          const { data, error } = await supabase.rpc('delete_chat_session_atomic', {
            session_id_param: sessionId
          });

          if (error) {
            console.error(`❌ [DELETE SESSIONS] RPC Error for ${sessionId}:`, error);
            failedDeletions.push(sessionId);
            return { sessionId, success: false, error };
          }

          if (!data?.success) {
            console.error(`❌ [DELETE SESSIONS] Function error for ${sessionId}:`, data);
            failedDeletions.push(sessionId);
            return { sessionId, success: false, error: data?.error };
          }

          successResults.push(data);
          console.log(`✅ [DELETE SESSIONS] Sucesso para ${sessionId}`);
          return { sessionId, success: true, data };
        } catch (error) {
          console.error(`❌ [DELETE SESSIONS] Exception for ${sessionId}:`, error);
          failedDeletions.push(sessionId);
          return { sessionId, success: false, error };
        }
      });

      await Promise.all(deletePromises);
    }

    // Forçar invalidação completa e refetch
    const successfulIds = validIds.filter(id => !failedDeletions.includes(id));
    const totalCleaned = successfulIds.length + invalidIds.length;
    
    if (totalCleaned > 0) {
      // Clear current session if it was among the deleted ones
      if (currentSessionId && (successfulIds.includes(currentSessionId) || invalidIds.includes(currentSessionId))) {
        setCurrentSessionId(null);
      }

      // Forçar invalidação completa das queries
      queryClient.invalidateQueries(['chatSessions']);
      
      // Forçar refetch para garantir sincronização
      await refetchSessions();
      console.log('🔄 Cache invalidado e sessões recarregadas após exclusão múltipla');
    }

    // Show consolidated toast
    console.log(`📊 [DELETE SESSIONS] Resultados: ${successfulIds.length} válidos excluídos, ${invalidIds.length} inválidos removidos, ${failedDeletions.length} falharam`);
    
    if (failedDeletions.length === 0 && invalidIds.length === 0) {
      toast({
        title: "Sucesso",
        description: `${sessionIds.length} conversa(s) excluída(s) com sucesso`,
      });
    } else if (totalCleaned > 0) {
      let description = `${totalCleaned} conversa(s) removida(s).`;
      if (invalidIds.length > 0) {
        description += ` ${invalidIds.length} tinha(m) ID inválido.`;
      }
      if (failedDeletions.length > 0) {
        description += ` ${failedDeletions.length} falharam.`;
      }
      
      toast({
        title: "Exclusão concluída",
        description,
        variant: invalidIds.length > 0 ? "destructive" : "default"
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
  }, [toast, currentSessionId, queryClient, refetchSessions]);

  const updateSession = useCallback(async (sessionId: string, lastMessage: string) => {
    try {
      // Atualizar chat_sessions
      await supabase
        .from('chat_sessions')
        .update({ 
          last_message: lastMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Remover incremento duplicado - agora feito diretamente no useMessageSubmit

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
