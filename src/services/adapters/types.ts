export interface ChatOptions {
  sessionId?: string;
  userId?: string;
  agentConfig?: {
    name?: string;
    model?: string;
    provider?: string;
    parameters?: {
      temperature?: number;
      max_tokens?: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface ChatResponse {
  content: string;
  conversationId: string;
  messageId: string;
  metadata?: {
    model?: string;
    usage?: any;
    [key: string]: any;
  };
}

export interface ChatAdapter {
  process(message: string, options: ChatOptions): Promise<ChatResponse>;
}
