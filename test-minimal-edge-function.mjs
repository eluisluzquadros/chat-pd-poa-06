#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Criando Edge Function mínima para teste...\n');

// Criar uma função simples de teste
const testFunctionCode = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    // Verificar se as API keys estão disponíveis
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
    const hasAnthropic = !!Deno.env.get('ANTHROPIC_API_KEY');
    const hasGemini = !!Deno.env.get('GEMINI_API_KEY');
    
    return new Response(JSON.stringify({
      success: true,
      message: \`Recebi: \${message}\`,
      apis: {
        openai: hasOpenAI,
        anthropic: hasAnthropic,
        gemini: hasGemini
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;

// Salvar e deployar a função
import fs from 'fs';
import { execSync } from 'child_process';

console.log('1. Criando função de teste...');
const functionsDir = './supabase/functions/test-minimal';
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
}

fs.writeFileSync(`${functionsDir}/index.ts`, testFunctionCode);
console.log('✅ Arquivo criado');

console.log('\n2. Fazendo deploy...');
try {
  execSync(`npx supabase functions deploy test-minimal --project-ref ngrqwmvuhvjkeohesbxs`, { stdio: 'inherit' });
  console.log('✅ Deploy concluído');
} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
}

console.log('\n3. Testando a função...');
setTimeout(async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-minimal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'teste simples'
      })
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.error('❌ Erro:', error);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
  
  console.log('\n\n💡 DIAGNÓSTICO:');
  console.log('- Se a função simples funciona, o problema está na complexidade do agentic-rag');
  console.log('- Se nem a função simples funciona, há um problema de infraestrutura');
  console.log('- Verifique os logs no dashboard do Supabase');
}, 3000);