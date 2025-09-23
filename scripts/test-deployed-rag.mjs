#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testando função agentic-rag deployada...\n');

const queries = [
  "O que diz o artigo 75?",
  "Quais bairros têm proteção contra enchentes?",
  "Qual a altura máxima em Petrópolis?",
  "O que é concessão urbanística?"
];

async function testQuery(query) {
  console.log(`📝 Query: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Verificar se está usando RAG real
      const isRealRAG = data.agentTrace && 
        data.agentTrace.some(trace => 
          trace.type === 'rag-pipeline' || 
          trace.steps?.includes('embedding_generation')
        );
      
      console.log(`✅ Status: ${isRealRAG ? 'RAG REAL' : 'Fallback/Cache'}`);
      console.log(`📊 Confidence: ${data.confidence || 'N/A'}`);
      console.log(`📝 Response: ${data.response?.substring(0, 200)}...`);
      
      if (isRealRAG) {
        console.log(`🎉 USANDO RAG REAL COM BUSCA VETORIAL!`);
      }
    } else {
      console.log(`❌ Erro: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log(`Details: ${error.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`❌ Erro na requisição: ${error.message}`);
  }
  
  console.log('-'.repeat(60));
}

async function runTests() {
  for (const query of queries) {
    await testQuery(query);
    // Pequena pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Testes concluídos!');
  console.log('📍 Dashboard: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions');
}

runTests().catch(console.error);