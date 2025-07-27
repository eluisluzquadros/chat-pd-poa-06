
export type UserRole = "admin" | "analyst" | "citizen" | "supervisor";

export type LLMProvider = 
  | "openai" 
  | "claude" 
  | "gemini" 
  | "llama" 
  | "deepseek" 
  | "qwen";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  last_message?: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  model?: LLMProvider | null;
}

export interface WebhookRequest {
  message: string;
  sessionId: string;
  userRole: string;
  timestamp: string;
}

export interface WebhookResponse {
  response?: string;
  message?: string;
  content?: string;
  reply?: string;
  text?: string;
  output?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any; // Allow any additional fields
}
