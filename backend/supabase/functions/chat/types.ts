
export interface ChatRequest {
  message: string
  model: string
  documentIds: string[]
  sessionId: string | null
  userId: string
}

export interface ChatResponse {
  content: string
  threadId: string
  progressMessages: string[]
}

export interface RunCompletionResult {
  status: "completed" | "timeout_but_continue" | "failed"
  progressMessages: string[]
}
