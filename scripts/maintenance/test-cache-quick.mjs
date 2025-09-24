#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function testCache() {
  console.log('🧪 TESTE RÁPIDO DE CACHE\n');
  
  // Teste 1: Query que já está no cache
  console.log('📝 Teste 1: Query pré-aquecida (deve vir do cache)');
  const query1 = 'o que são zeis';
  
  const start1 = Date.now();
  const response1 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: query1,
      sessionId: 'cache-test',
      bypassCache: false
    })
  });
  
  const result1 = await response1.json();
  const time1 = Date.now() - start1;
  
  const fromCache1 = result1.sources?.cached === true || 
                     result1.agentTrace?.some(t => t.step === 'cache_hit');
  
  console.log(`   Query: "${query1}"`);
  console.log(`   Tempo: ${time1}ms`);
  console.log(`   Cache: ${fromCache1 ? '✅ HIT' : '❌ MISS'}`);
  console.log(`   Preview: ${result1.response?.substring(0, 100)}...`);
  
  // Teste 2: Query nova
  console.log('\n📝 Teste 2: Query nova (deve ser processada e salva no cache)');
  const query2 = 'qual a diferença entre zot e zeis';
  
  const start2 = Date.now();
  const response2 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: query2,
      sessionId: 'cache-test',
      bypassCache: false
    })
  });
  
  const result2 = await response2.json();
  const time2 = Date.now() - start2;
  
  const fromCache2 = result2.sources?.cached === true || 
                     result2.agentTrace?.some(t => t.step === 'cache_hit');
  
  console.log(`   Query: "${query2}"`);
  console.log(`   Tempo: ${time2}ms`);
  console.log(`   Cache: ${fromCache2 ? '✅ HIT' : '❌ MISS'}`);
  console.log(`   Preview: ${result2.response?.substring(0, 100)}...`);
  
  // Teste 3: Repetir query 2 (agora deve vir do cache)
  console.log('\n📝 Teste 3: Repetir query anterior (deve vir do cache agora)');
  
  // Aguardar um pouco para garantir que foi salvo
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const start3 = Date.now();
  const response3 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: query2,
      sessionId: 'cache-test',
      bypassCache: false
    })
  });
  
  const result3 = await response3.json();
  const time3 = Date.now() - start3;
  
  const fromCache3 = result3.sources?.cached === true || 
                     result3.agentTrace?.some(t => t.step === 'cache_hit');
  
  console.log(`   Query: "${query2}"`);
  console.log(`   Tempo: ${time3}ms`);
  console.log(`   Cache: ${fromCache3 ? '✅ HIT' : '❌ MISS'}`);
  
  // Resumo
  console.log('\n📊 RESUMO:');
  console.log('════════════════════════════════');
  
  if (fromCache1) {
    console.log('✅ Cache de queries pré-aquecidas: FUNCIONANDO');
  } else {
    console.log('❌ Cache de queries pré-aquecidas: NÃO FUNCIONANDO');
  }
  
  if (!fromCache2 && fromCache3) {
    console.log('✅ Salvamento de novas queries: FUNCIONANDO');
    console.log(`   Speedup: ${Math.round((time2 - time3) / time2 * 100)}% mais rápido`);
  } else if (!fromCache2 && !fromCache3) {
    console.log('❌ Salvamento de novas queries: NÃO FUNCIONANDO');
  }
  
  const avgCacheTime = fromCache1 ? time1 : (fromCache3 ? time3 : 0);
  const avgNoCacheTime = !fromCache2 ? time2 : 0;
  
  if (avgCacheTime > 0 && avgNoCacheTime > 0) {
    const improvement = Math.round((avgNoCacheTime - avgCacheTime) / avgNoCacheTime * 100);
    console.log(`\n⚡ Performance com cache: ${improvement}% mais rápido`);
  }
}

testCache().catch(console.error);