import { ChatResponse } from "../types.ts";
import { trackTokenUsage, logLLMMetrics } from "../../_shared/token-tracker.ts";

// Função para estimar tokens (aproximação: ~4 chars = 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Função para truncar histórico mantendo limite de tokens
function truncateHistory(history: any[], maxTokens: number): any[] {
  const truncated: any[] = [];
  let currentTokens = 0;
  
  // Adicionar mensagens do mais recente para o mais antigo
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(history[i].content || '');
    if (currentTokens + msgTokens > maxTokens) {
      break;
    }
    truncated.unshift(history[i]);
    currentTokens += msgTokens;
  }
  
  return truncated;
}

export async function processLovableAgent(
  message: string,
  sessionId: string | null,
  agent: any,
  apiKey: string
): Promise<ChatResponse> {
  
  console.log(`📝 Processing with Lovable agent: ${agent.display_name}`);
  
  const systemPrompt = agent.parameters?.system_prompt || "You are a helpful assistant.";
  const maxCompletionTokens = agent.parameters?.max_tokens || 4000;
  const temperature = agent.parameters?.temperature || 0.7;
  const maxHistoryMessages = agent.parameters?.max_history_messages || 30;
  const modelName = agent.model || "gpt-4o-mini";
  
  // Buscar histórico da sessão (se houver)
  let conversationHistory: any[] = [];
  
  if (sessionId) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: history } = await supabase
      .from('chat_history')
      .select('message')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(maxHistoryMessages);
    
    if (history) {
      conversationHistory = history.map(h => h.message);
      
      // Controle de tokens: reservar 2000 tokens para histórico
      const maxHistoryTokens = 2000;
      const historyTokenCount = conversationHistory.reduce(
        (total, msg) => total + estimateTokens(msg.content || ''), 
        0
      );
      
      if (historyTokenCount > maxHistoryTokens) {
        console.log(`⚠️ History tokens (${historyTokenCount}) exceeded limit, truncating...`);
        conversationHistory = truncateHistory(conversationHistory, maxHistoryTokens);
        console.log(`✂️ Truncated to ${conversationHistory.length} messages`);
      }
    }
  }
  
  // Montar mensagens para OpenAI Completions API
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: message }
  ];
  
  console.log(`🔄 Calling OpenAI Completions API with ${messages.length} messages`);
  
  const startTime = Date.now();
  
  // Chamar OpenAI Completions API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      max_completion_tokens: maxCompletionTokens,
      temperature: temperature,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenAI API Error: ${response.status} - ${errorText}`);
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const assistantMessage = data.choices[0]?.message?.content || "No response generated";
  const executionTime = Date.now() - startTime;
  
  console.log(`✅ Lovable agent response generated (${assistantMessage.length} chars)`);
  
  // ✅ Track token usage with correct model name
  const usage = data.usage;
  if (usage) {
    await trackTokenUsage({
      sessionId: sessionId || undefined,
      model: modelName,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      source: 'chat:lovable-agent',
      messagePreview: message.substring(0, 100),
    });

    await logLLMMetrics({
      modelName: modelName,
      provider: 'openai',
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      executionTimeMs: executionTime,
      success: true,
      requestType: 'lovable-agent-chat',
      sessionId: sessionId || undefined,
      metadata: { agentName: agent.display_name },
    });
  }
  
  return {
    content: assistantMessage,
    threadId: sessionId || "no-thread",
    progressMessages: []
  };
}
