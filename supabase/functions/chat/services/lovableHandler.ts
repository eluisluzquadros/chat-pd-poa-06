import { ChatResponse } from "../types.ts";

export async function processLovableAgent(
  message: string,
  sessionId: string | null,
  agent: any,
  apiKey: string
): Promise<ChatResponse> {
  
  console.log(`📝 Processing with Lovable agent: ${agent.display_name}`);
  
  const systemPrompt = agent.parameters?.system_prompt || "You are a helpful assistant.";
  const maxTokens = agent.parameters?.max_tokens || 4000;
  const temperature = agent.parameters?.temperature || 0.7;
  
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
      .limit(10);
    
    if (history) {
      conversationHistory = history.map(h => h.message);
    }
  }
  
  // Montar mensagens para OpenAI Completions API
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: message }
  ];
  
  console.log(`🔄 Calling OpenAI Completions API with ${messages.length} messages`);
  
  // Chamar OpenAI Completions API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: agent.model || "gpt-4o-mini",
      messages: messages,
      max_tokens: maxTokens,
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
  
  console.log(`✅ Lovable agent response generated (${assistantMessage.length} chars)`);
  
  return {
    content: assistantMessage,
    threadId: sessionId || "no-thread",
    progressMessages: []
  };
}
