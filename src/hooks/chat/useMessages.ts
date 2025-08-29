
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const loadMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      const { data: history, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = history.map(msg => {
        // Handle both string and object message formats
        let content: string;
        let role: "user" | "assistant";
        let model: string | undefined;

        if (typeof msg.message === 'string') {
          content = msg.message;
          role = 'user'; // Default to user for string messages
        } else if (msg.message && typeof msg.message === 'object' && !Array.isArray(msg.message)) {
          const messageObj = msg.message as Record<string, any>;
          content = messageObj.content || JSON.stringify(msg.message);
          role = (messageObj.role as "user" | "assistant") || 'user';
          model = messageObj.model;
        } else {
          content = 'Mensagem inválida';
          role = 'user';
        }

        return {
          id: msg.id,
          content,
          role,
          timestamp: new Date(msg.created_at),
          model,
        };
      });

      setMessages(formattedMessages);
      return formattedMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar mensagens",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  return {
    messages,
    loadMessages,
    clearMessages,
    addMessage,
  };
}
