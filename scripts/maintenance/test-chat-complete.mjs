#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 TESTE COMPLETO DO CHAT PD POA\n');

async function testChat() {
  console.log('1️⃣ Testando conexão com Supabase...');
  
  // Testar conexão básica
  const { data: healthCheck, error: healthError } = await supabase
    .from('query_cache')
    .select('count')
    .limit(1);
  
  if (healthError) {
    console.log('   ❌ Erro na conexão:', healthError.message);
    return;
  }
  console.log('   ✅ Conexão OK\n');
  
  console.log('2️⃣ Testando função agentic-rag...');
  
  const testCases = [
    {
      query: 'Qual a altura máxima no Centro Histórico?',
      expected: '75'
    },
    {
      query: 'O que é ZOT?',
      expected: 'zona'
    },
    {
      query: 'Qual o coeficiente de aproveitamento básico?',
      expected: 'coeficiente'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`\n   📝 Testando: "${test.query}"`);
    
    const start = Date.now();
    
    // Usar supabase.functions.invoke como o chatService faz
    const { data: result, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: test.query,  // Usar 'message' como o chatService
        userRole: 'citizen',
        sessionId: 'test-complete',
        bypassCache: false,
        model: 'openai/gpt-3.5-turbo'
      }
    });
    
    const time = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      failed++;
    } else if (result && result.response) {
      const response = result.response.toLowerCase();
      const hasExpected = response.includes(test.expected.toLowerCase());
      
      if (hasExpected) {
        console.log(`   ✅ Sucesso (${time}ms)`);
        console.log(`      Resposta: ${result.response.substring(0, 100)}...`);
        passed++;
      } else {
        console.log(`   ⚠️ Resposta não contém "${test.expected}" (${time}ms)`);
        console.log(`      Resposta: ${result.response.substring(0, 100)}...`);
        failed++;
      }
    } else {
      console.log(`   ❌ Resposta vazia`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO FINAL:');
  console.log(`   ✅ Passou: ${passed}/${testCases.length}`);
  console.log(`   ❌ Falhou: ${failed}/${testCases.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 SUCESSO TOTAL! O chat está 100% funcional.');
  } else if (passed > 0) {
    console.log('\n⚠️ Parcialmente funcional. Alguns testes falharam.');
  } else {
    console.log('\n❌ Falha completa. Verificar logs das Edge Functions.');
  }
  
  console.log('\n💡 Para testar no navegador, acesse:');
  console.log('   http://localhost:8080/chat');
}

testChat().catch(console.error);