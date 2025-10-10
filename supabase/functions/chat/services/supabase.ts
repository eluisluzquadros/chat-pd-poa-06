
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Function to get secrets from Supabase
export async function getSecrets() {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log("🔑 Getting secrets from Supabase Vault...");
  const { data: secrets, error: secretsError } = await supabaseClient
    .from("decrypted_secrets")
    .select("name, decrypted_secret");

  if (secretsError || !secrets) {
    throw new Error("Error retrieving secrets from Vault.");
  }

  const secretsMap = Object.fromEntries(
    secrets.map(({ name, decrypted_secret }) => [name, decrypted_secret])
  );

  const openaiApiKey = secretsMap["OPENAI_API_KEY"];
  const assistantId = secretsMap["ASSISTANT_ID"];

  if (!openaiApiKey || !assistantId) {
    throw new Error("🔴 Required secrets missing.");
  }

  return { openaiApiKey, assistantId };
}
