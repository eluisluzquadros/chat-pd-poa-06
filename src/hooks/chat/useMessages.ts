
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

      const formattedMessages = history.map(msg => ({
        id: msg.id,
        content: typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message),
        role: (typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : 'user') as "user" | "assistant",
        timestamp: new Date(msg.created_at),
        model: typeof msg.message === 'object' && msg.message && 'model' in msg.message ? String(msg.message.model) : undefined,
      }));

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
