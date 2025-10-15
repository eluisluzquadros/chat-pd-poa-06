import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  model: string; // UUID do agente
  sessionId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[unified-chat] Request received");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { message, model, sessionId }: ChatRequest = await req.json();

    if (!message || !model) {
      throw new Error("Missing required fields: message and model");
    }

    console.log(`[unified-chat] Message: ${message.substring(0, 50)}...`);
    console.log(`[unified-chat] Agent UUID: ${model}`);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("dify_agents")
      .select("*")
      .eq("id", model)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("[unified-chat] Agent not found:", agentError);
      throw new Error(`Agent not found or inactive: ${model}`);
    }

    console.log(`[unified-chat] Agent found: ${agent.name} (${agent.provider})`);

    const startTime = Date.now();
    let response: string;
    let tokensUsed = 0;

    // Route to appropriate provider
    if (agent.provider === "dify") {
      // Call Dify API
      const difyApiKey = Deno.env.get("DIFY_API_KEY");
      if (!difyApiKey) {
        throw new Error("DIFY_API_KEY not configured");
      }

      const difyUrl = agent.dify_config?.api_url || "https://api.dify.ai/v1";
      const conversationId = sessionId || crypto.randomUUID();

      console.log(`[unified-chat] Calling Dify API: ${difyUrl}`);

      const difyResponse = await fetch(`${difyUrl}/chat-messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${difyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {},
          query: message,
          response_mode: "blocking",
          conversation_id: conversationId,
          user: "qa-system",
        }),
      });

      if (!difyResponse.ok) {
        const errorText = await difyResponse.text();
        console.error("[unified-chat] Dify API error:", errorText);
        throw new Error(`Dify API error: ${difyResponse.status} - ${errorText}`);
      }

      const difyData = await difyResponse.json();
      response = difyData.answer || difyData.message || "";
      tokensUsed = difyData.metadata?.usage?.total_tokens || 0;

    } else if (agent.provider === "openrouter") {
      // Call OpenRouter API
      const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
      if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY not configured");
      }

      const modelName = agent.model || "anthropic/claude-3.5-sonnet";
      console.log(`[unified-chat] Calling OpenRouter with model: ${modelName}`);

      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
          "X-Title": "QA Validation System",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content: agent.parameters?.system_prompt || "Você é um assistente útil especializado em urbanismo e legislação de Curitiba.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: agent.parameters?.temperature || 0.7,
          max_tokens: agent.parameters?.max_tokens || 2000,
        }),
      });

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        console.error("[unified-chat] OpenRouter API error:", errorText);
        throw new Error(`OpenRouter API error: ${openRouterResponse.status} - ${errorText}`);
      }

      const openRouterData = await openRouterResponse.json();
      response = openRouterData.choices?.[0]?.message?.content || "";
      tokensUsed = openRouterData.usage?.total_tokens || 0;

    } else {
      throw new Error(`Unsupported provider: ${agent.provider}`);
    }

    const executionTime = Date.now() - startTime;

    console.log(`[unified-chat] Response generated in ${executionTime}ms`);
    console.log(`[unified-chat] Tokens used: ${tokensUsed}`);

    // Return formatted response
    return new Response(
      JSON.stringify({
        response,
        model: agent.model,
        provider: agent.provider,
        metadata: {
          executionTime,
          tokens: tokensUsed,
          agentName: agent.name,
          sessionId,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[unified-chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
