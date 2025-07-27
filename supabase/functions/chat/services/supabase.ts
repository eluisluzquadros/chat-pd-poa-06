
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Function to get secrets from Supabase
export async function getSecrets() {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log("🔑 Getting secrets from Supabase...");
  const { data: secrets, error: secretsError } = await supabaseClient
    .from("secrets")
    .select("name, secret_value");

  if (secretsError || !secrets) {
    throw new Error("Error retrieving secrets from Supabase.");
  }

  const secretsMap = Object.fromEntries(
    secrets.map(({ name, secret_value }) => [name, secret_value])
  );

  const openaiApiKey = secretsMap["OPENAI_API_KEY"];
  const assistantId = secretsMap["ASSISTANT_ID"];

  if (!openaiApiKey || !assistantId) {
    throw new Error("🔴 Required secrets missing.");
  }

  return { openaiApiKey, assistantId };
}
