
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CORS_HEADERS } from "./constants.ts";
import { getSecrets } from "./services/supabase.ts";
import { processUserMessage } from "./services/messageProcessor.ts";

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
    if (agentId) {
      console.log(`🤖 Using agent configuration: ${agentId}`);
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { data: agent, error: agentError } = await supabase
        .from('dify_agents')
        .select('parameters, display_name')
        .eq('id', agentId)
        .single();
      
      if (agentError) {
        console.error("❌ Error fetching agent:", agentError);
      } else if (agent?.parameters?.assistant_id) {
        finalAssistantId = agent.parameters.assistant_id;
        console.log(`✅ Using assistant from agent "${agent.display_name}": ${finalAssistantId}`);
      }
    }

    const response = await processUserMessage(message, sessionId, finalAssistantId, openaiApiKey);

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
