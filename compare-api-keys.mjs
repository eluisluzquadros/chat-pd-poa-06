#!/usr/bin/env node

import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdDE6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.Z88B7cibGtKOaStOhfkDIwOGCCa7RWXU-8dSJVFKHHI';

console.log('🔍 Comparando OPENAI_API_KEY em diferentes locais...\n');

// Função para calcular hash SHA256
function calculateHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// 1. Ler do .env.local
console.log('1️⃣ Lendo do .env.local...');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const envApiKey = envConfig.OPENAI_API_KEY;
const envHash = calculateHash(envApiKey);
console.log(`   Valor: ${envApiKey.substring(0, 20)}...${envApiKey.substring(envApiKey.length - 10)}`);
console.log(`   Hash: ${envHash}`);

// 2. Ler da tabela secrets
console.log('\n2️⃣ Lendo da tabela secrets...');
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/secrets?name=eq.OPENAI_API_KEY&select=secret_value`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    }
  });
  
  if (response.ok) {
    const [secret] = await response.json();
    if (secret?.secret_value) {
      const dbApiKey = secret.secret_value;
      const dbHash = calculateHash(dbApiKey);
      console.log(`   Valor: ${dbApiKey.substring(0, 20)}...${dbApiKey.substring(dbApiKey.length - 10)}`);
      console.log(`   Hash: ${dbHash}`);
      console.log(`   ✅ Match com .env.local: ${dbHash === envHash ? 'SIM' : 'NÃO'}`);
    } else {
      console.log('   ❌ Não encontrada na tabela secrets');
    }
  } else {
    console.log('   ❌ Erro ao acessar tabela secrets:', response.status);
  }
} catch (error) {
  console.log('   ❌ Erro:', error.message);
}

// 3. Verificar Edge Functions secrets (via Supabase CLI)
console.log('\n3️⃣ Edge Functions Secrets (hash do Supabase CLI)...');
console.log('   Hash armazenado: 868bdbf771280f454547245d075c5d79c1e710b27a61abdd72dd2ebfa940b02e');

// Calcular o hash que deveria estar nas Edge Functions
console.log(`   Hash esperado (do .env.local): ${envHash}`);
console.log(`   ✅ Match: ${envHash === '868bdbf771280f454547245d075c5d79c1e710b27a61abdd72dd2ebfa940b02e' ? 'SIM' : 'NÃO'}`);

// 4. Testar diretamente a API OpenAI com a chave do .env.local
console.log('\n4️⃣ Testando API OpenAI com a chave do .env.local...');
try {
  const openaiResponse = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${envApiKey}`,
    }
  });
  
  if (openaiResponse.ok) {
    console.log('   ✅ API key válida - OpenAI respondeu com sucesso');
  } else {
    const error = await openaiResponse.json();
    console.log('   ❌ API key inválida ou sem créditos:', error.error?.message || openaiResponse.status);
  }
} catch (error) {
  console.log('   ❌ Erro ao testar:', error.message);
}

console.log('\n\n📊 RESUMO:');
console.log('- Se os hashes não coincidem, as chaves são diferentes');
console.log('- Se a API responde com erro 401, a chave é inválida');
console.log('- Se a API responde com erro 429, há limite de rate ou créditos');