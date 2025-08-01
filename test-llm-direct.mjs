#\!/usr/bin/env node

import fetch from "node-fetch";

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.Z88B7cibGtKOaStOhfkDIwOGCCa7RWXU-8dSJVFKHHI";

console.log("🧪 Testando acesso direto ao banco para verificar API keys...\n");

async function getSecrets() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/secrets?select=name,created_at`, {
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
        "Content-Type": "application/json",
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Secrets encontradas:");
      data.forEach(secret => {
        console.log(`   - ${secret.name} (criada em: ${new Date(secret.created_at).toLocaleString()})`);
      });
      return true;
    } else {
      console.error("❌ Erro ao buscar secrets:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return false;
  }
}

async function testOpenAI() {
  console.log("\n📝 Testando OpenAI diretamente...");
  
  // Buscar a API key do banco
  const response = await fetch(`${SUPABASE_URL}/rest/v1/secrets?name=eq.OPENAI_API_KEY&select=secret_value`, {
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    }
  });
  
  if (\!response.ok) {
    console.error("❌ Não foi possível buscar a API key");
    return;
  }
  
  const [secret] = await response.json();
  if (\!secret?.secret_value) {
    console.error("❌ API key não encontrada");
    return;
  }
  
  // Testar OpenAI
  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret.secret_value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Responda apenas: OK" }],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      console.log("✅ OpenAI funcionando:", data.choices[0].message.content);
    } else {
      const error = await openaiResponse.text();
      console.error("❌ Erro OpenAI:", openaiResponse.status, error);
    }
  } catch (error) {
    console.error("❌ Erro ao testar OpenAI:", error.message);
  }
}

async function main() {
  const hasSecrets = await getSecrets();
  
  if (hasSecrets) {
    await testOpenAI();
  }
  
  console.log("\n\n🔍 DIAGNÓSTICO:");
  console.log("1. Se as secrets existem mas OpenAI falha, verifique a API key");
  console.log("2. Se OpenAI funciona mas o chat não, o problema está nas Edge Functions");
  console.log("3. Verifique os logs no dashboard do Supabase para erros específicos");
}

main().catch(console.error);
