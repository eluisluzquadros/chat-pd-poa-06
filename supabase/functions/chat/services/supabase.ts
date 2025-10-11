// Function to get secrets from environment variables
export async function getSecrets() {
  console.log("🔑 Getting secrets from environment...");
  
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const assistantId = Deno.env.get("ASSISTANT_ID");
  const llamacloudApiKey = Deno.env.get("LLAMACLOUD_API_KEY");

  console.log("✅ Secrets loaded:", {
    hasOpenAI: !!openaiApiKey,
    hasAssistant: !!assistantId,
    hasLlamaCloud: !!llamacloudApiKey
  });

  return { openaiApiKey, assistantId, llamacloudApiKey };
}
