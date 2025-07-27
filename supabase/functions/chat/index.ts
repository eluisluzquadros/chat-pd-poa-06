
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
    const { message, sessionId } = requestData;

    if (!message) {
      throw new Error("🔴 User message cannot be empty.");
    }

    const response = await processUserMessage(message, sessionId, assistantId, openaiApiKey);

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
