
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CORS_HEADERS } from "./constants.ts";
import { getSecrets } from "./services/supabase.ts";
import { processUserMessage } from "./services/messageProcessor.ts";
import { processLovableAgent } from "./services/lovableHandler.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    console.log("🚀 Starting chat function...");

    // Get credentials
    const { openaiApiKey, assistantId } = await getSecrets();

    // Process request
    const requestData = await req.json();
    const { message, sessionId, agentId } = requestData;

    if (!message) {
      throw new Error("🔴 User message cannot be empty.");
    }

    // Use agent-specific configuration if provided
    let finalAssistantId = assistantId;
    let isExternalAgent = false;
    let agent = null;
    
    if (agentId) {
      console.log(`🤖 Using agent configuration: ${agentId}`);
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { data: agentData, error: agentError } = await supabase
        .from('dify_agents')
        .select('parameters, display_name, model, provider')
        .eq('id', agentId)
        .single();
      
      if (agentError) {
        console.error("❌ Error fetching agent:", agentError);
        throw new Error(`Failed to fetch agent: ${agentError.message}`);
      }
      
      agent = agentData;
      
      // Detectar tipo de agente
      if (agent?.parameters?.assistant_id) {
        // Agente externo usando OpenAI Assistants API
        finalAssistantId = agent.parameters.assistant_id;
        isExternalAgent = true;
        console.log(`✅ Using OpenAI Assistant from agent "${agent.display_name}": ${finalAssistantId}`);
      } else {
        // Agente Lovable usando Completions API
        console.log(`✅ Using Lovable agent "${agent.display_name}" with Completions API`);
        isExternalAgent = false;
      }
    }

    // Validar segredos baseado no tipo de agente
    if (isExternalAgent && (!openaiApiKey || !finalAssistantId)) {
      throw new Error("🔴 OpenAI API key and Assistant ID required for external assistant");
    }
    
    if (!isExternalAgent && agentId && !openaiApiKey) {
      throw new Error("🔴 OpenAI API key required for Lovable agent");
    }
    
    if (!agentId && (!openaiApiKey || !finalAssistantId)) {
      throw new Error("🔴 OpenAI secrets required");
    }

    // Rotear para o processador apropriado
    let response;
    
    if (isExternalAgent || !agentId) {
      // Usar OpenAI Assistants API (fluxo existente)
      response = await processUserMessage(message, sessionId, finalAssistantId, openaiApiKey);
    } else {
      // Usar OpenAI Completions API para agentes Lovable
      response = await processLovableAgent(message, sessionId, agent, openaiApiKey);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("🔥 Error in processing:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
