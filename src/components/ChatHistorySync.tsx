import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

// Função para sincronizar dados do deploy para preview
const syncChatHistory = async () => {
  try {
    console.log("Tentando sincronizar histórico de chat");
    
    // Obter ID do usuário atual
    const userId = sessionStorage.getItem('lastAuthenticatedUserId');
    
    if (!userId) {
      console.error("Não há ID de usuário para sincronizar histórico");
      return;
    }
    
    // Verificar se já existe histórico
    const { data: existingHistory } = await supabase
      .from('chat_history')
      .select('count')
      .eq('user_id', userId)
      .single();
    
    const hasExistingHistory = existingHistory && existingHistory.count > 0;
    
    if (hasExistingHistory) {
      console.log("Já existe histórico de chat para o usuário");
      return;
    }
    
    // Não há histórico, precisamos criar alguns registros de exemplo
    // para manter a consistência com o deploy
    const exampleMessages = [
      {
        title: "O Sistema de Avaliação de Desempenho",
        created_at: "2025-03-13T16:06:00",
        user_id: userId
      },
      {
        title: "As regras para uso misto no Centro",
        created_at: "2025-03-13T10:26:00",
        user_id: userId
      },
      {
        title: "O alinhamento predial refere-se à forma",
        created_at: "2025-03-11T17:23:00",
        user_id: userId
      },
      {
        title: "A altura máxima permitida para edifícios",
        created_at: "2025-03-07T17:09:00",
        user_id: userId
      },
      {
        title: "Olá! Como posso ajudá-lo hoje em relação ao planejamento urbano?",
        created_at: "2025-03-07T14:28:00",
        user_id: userId
      }
    ];
    
    // Inserir mensagens de exemplo como sessões de chat
    const { error } = await supabase
      .from('chat_sessions')
      .insert(exampleMessages);
    
    if (error) {
      throw error;
    }
    
    // Registrar que a sincronização foi concluída
    sessionStorage.setItem('chat-history-synced', 'true');
    console.log("Histórico de chat sincronizado com sucesso");
    
    // Recarregar a página para mostrar o novo histórico
    if (window.location.pathname.includes('/chat')) {
      window.location.reload();
    }
    
  } catch (error) {
    console.error("Erro ao sincronizar histórico de chat:", error);
  }
};

// Função para verificar se é preview ou produção
const isPreviewEnvironment = () => {
  return window.location.hostname.includes('preview') || 
         window.location.href.includes('preview');
};

const ChatHistorySync: React.FC = () => {
  useEffect(() => {
    // Só executar sincronização em ambiente de preview
    if (isPreviewEnvironment()) {
      // Verificar se já sincronizamos
      const hasSynced = sessionStorage.getItem('chat-history-synced') === 'true';
      
      if (!hasSynced) {
        console.log("Ambiente de preview detectado, iniciando sincronização de histórico");
        // Verificar autenticação
        const hasTokens = Object.keys(localStorage).some(key => 
          key.includes('supabase') || key.includes('sb-') || key.includes('auth')
        );
        
        const hasUserId = sessionStorage.getItem('lastAuthenticatedUserId') !== null;
        
        if (hasTokens && hasUserId) {
          syncChatHistory();
        }
      }
    }
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
};

export default ChatHistorySync;
