
export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
}

export interface AgentState {
  messages: AgentMessage[];
  context?: string[];
  currentAgent: "reasoning" | "rag" | "evaluation" | "completion";
  userRole: "citizen" | "admin" | "supervisor" | "analyst";
  documentIds: string[];
  currentSessionId?: string | null;
  evaluation?: {
    quality: number;
    feedback: string;
    satisfactory: boolean;
  };
}

export interface EmbeddingSearchResult {
  content_chunk: string;
  similarity: number;
}
