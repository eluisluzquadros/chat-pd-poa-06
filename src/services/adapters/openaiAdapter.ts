import { supabase } from '@/integrations/supabase/client';
import type { ChatAdapter, ChatOptions, ChatResponse } from './types';

export class OpenAIAdapter implements ChatAdapter {
  async process(message: string, options: ChatOptions): Promise<ChatResponse> {
    console.log('🤖 [OpenAI Adapter] Processing message via Edge Function');

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        message,
        sessionId: options.sessionId,
        userId: options.userId,
        agentConfig: options.agentConfig,
      }
    });

    if (error) {
      console.error('❌ [OpenAI Adapter] Error:', error);
      throw new Error(`OpenAI Edge Function error: ${error.message}`);
    }

    if (!data || !data.answer) {
      console.error('❌ [OpenAI Adapter] Invalid response:', data);
      throw new Error('Invalid response from OpenAI Edge Function');
    }

    return {
      content: data.answer,
      conversationId: options.sessionId || '',
      messageId: crypto.randomUUID(),
      metadata: {
        model: data.model,
        usage: data.usage,
      }
    };
  }
}
