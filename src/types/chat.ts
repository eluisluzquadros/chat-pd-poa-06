
export type UserRole = "admin" | "analyst" | "citizen" | "supervisor";

export type LLMProvider = 
  | "openai" 
  | "gpt-4.5" 
  | "claude" 
  | "claude-3-opus" 
  | "claude-3-sonnet" 
  | "claude-3-haiku" 
  | "gemini" 
  | "gemini-pro" 
  | "gemini-pro-vision" 
  | "llama" 
  | "deepseek" 
  | "groq"
  | "anthropic"
  | "google"
  | "zhipuai";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
  metrics?: LLMMetrics;
}

export interface LLMMetrics {
  responseTime: number; // milliseconds
  tokensPerSecond: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costPerToken: number;
  totalCost: number;
  qualityScore: number; // 0-100
  confidence: number; // 0-1
  successRate: number; // percentage
  model: string;
  provider: LLMProvider;
}

export interface ModelPerformance {
  provider: LLMProvider;
  model: string;
  averageResponseTime: number;
  averageQualityScore: number;
  averageCost: number;
  successRate: number;
  tokensPerSecond: number;
  totalRequests: number;
  lastUpdated: Date;
}

export interface LLMComparison {
  models: ModelPerformance[];
  bestForSpeed: ModelPerformance;
  bestForQuality: ModelPerformance;
  bestForCost: ModelPerformance;
  recommendedModel: ModelPerformance;
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
