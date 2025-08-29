#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Deploy Helper for Supabase Edge Functions');
console.log('=' .repeat(50));

// O problema é que precisamos de um Access Token pessoal, não temos acesso à Management API
// Vamos criar um comando pronto para copiar e colar

console.log('\n⚠️  ATENÇÃO: Precisamos de um Access Token pessoal');
console.log('\n📋 PASSO 1: Obter Access Token');
console.log('--------------------------------');
console.log('1. Acesse: https://app.supabase.com/account/tokens');
console.log('2. Clique em "Generate new token"');
console.log('3. Dê um nome como "CLI Deploy"');
console.log('4. Copie o token gerado');

console.log('\n📋 PASSO 2: Configurar Token (Windows CMD)');
console.log('-------------------------------------------');
console.log('set SUPABASE_ACCESS_TOKEN=seu_token_aqui');

console.log('\n📋 PASSO 3: Deploy da Função');
console.log('-----------------------------');
console.log(`npx supabase functions deploy agentic-rag --project-ref ${PROJECT_REF}`);

console.log('\n📋 ALTERNATIVA: Deploy Manual via Dashboard');
console.log('--------------------------------------------');
console.log('1. Acesse: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs/functions/agentic-rag');
console.log('2. Clique em "Edit Function"');
console.log('3. Cole o código de: supabase/functions/agentic-rag/index.ts');
console.log('4. Clique em "Deploy"');

console.log('\n🧪 PASSO 4: Testar Função Após Deploy');
console.log('---------------------------------------');
console.log('Use o comando curl abaixo:\n');

const curlCommand = `curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \\
  -H "Authorization: Bearer ${ANON_KEY}" \\
  -H "Content-Type: application/json" \\
  --data '{"message":"O que diz o artigo 75?","bypassCache":true}'`;

console.log(curlCommand);

console.log('\n📊 Status Atual da Função');
console.log('-------------------------');

// Testar a função atual
async function testCurrentFunction() {
  try {
    const response = await fetch(`https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "teste rápido",
        bypassCache: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Detectar se está usando fallbacks ou RAG real
      if (data.response && data.response.includes('Art. 75. O regime volumétrico compreende')) {
        console.log('⚠️  Função está usando CÓDIGO ANTIGO (fallbacks)');
        console.log('❌ Precisa fazer deploy do novo código RAG real');
      } else if (data.agentTrace && data.agentTrace.some(a => a.type === 'rag-pipeline')) {
        console.log('✅ Função está usando CÓDIGO NOVO (RAG real)');
        console.log('🎉 Deploy já foi realizado com sucesso!');
      } else {
        console.log('❓ Status indefinido - faça o deploy para garantir');
      }
    } else {
      console.log('❌ Função não está respondendo corretamente');
    }
  } catch (error) {
    console.log('❌ Erro ao testar função:', error.message);
  }
}

testCurrentFunction();