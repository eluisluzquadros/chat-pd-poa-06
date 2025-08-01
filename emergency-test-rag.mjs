#!/usr/bin/env node

import fetch from 'node-fetch';

// Configurações
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

// Queries de teste
const TEST_QUERIES = [
  "O que posso construir no bairro Moinhos de Vento?",
  "Qual a altura máxima no Centro Histórico?",
  "Quais são as restrições da Cidade Baixa?",
  "Como funciona o índice de aproveitamento?",
  "O que é regime urbanístico?"
];

async function testFunction(functionName, payload) {
  console.log(`\n🧪 Testing ${functionName}...`);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ ${functionName} failed:`, data.error || data);
      return false;
    }
    
    console.log(`✅ ${functionName} responded successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${functionName} error:`, error.message);
    return false;
  }
}

async function testRAGPipeline(query) {
  console.log(`\n🔍 Testing full RAG pipeline for: "${query}"`);
  const sessionId = `test-${Date.now()}`;
  
  try {
    // Test query analyzer
    const analyzerResponse = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, sessionId })
    });
    
    if (!analyzerResponse.ok) {
      const error = await analyzerResponse.json();
      console.error('❌ Query Analyzer failed:', error);
      return false;
    }
    
    const analysis = await analyzerResponse.json();
    console.log('✅ Query analyzed:', {
      intent: analysis.intent,
      entities: analysis.entities
    });
    
    // Test agentic-rag
    const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        sessionId,
        stream: false 
      })
    });
    
    if (!ragResponse.ok) {
      const error = await ragResponse.json();
      console.error('❌ Agentic RAG failed:', error);
      return false;
    }
    
    const result = await ragResponse.json();
    console.log('✅ Response received:', result.content?.substring(0, 200) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ Pipeline error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚨 EMERGENCY RAG SYSTEM TEST');
  console.log('============================\n');
  
  // Test individual functions
  console.log('📋 Phase 1: Testing individual Edge Functions...');
  
  const functions = [
    { name: 'query-analyzer', payload: { query: 'teste', sessionId: 'test' } },
    { name: 'enhanced-vector-search', payload: { query: 'plano diretor', limit: 5 } },
    { name: 'sql-generator', payload: { analysis: { intent: 'test' } } },
    { name: 'response-synthesizer', payload: { query: 'test', results: [] } }
  ];
  
  let allPassed = true;
  for (const func of functions) {
    const passed = await testFunction(func.name, func.payload);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) {
    console.log('\n⚠️  Some functions are failing. Check:');
    console.log('1. Edge Function Secrets are configured');
    console.log('2. Functions are deployed');
    console.log('3. Check logs in Supabase Dashboard');
    return;
  }
  
  // Test full RAG pipeline
  console.log('\n📋 Phase 2: Testing full RAG pipeline...');
  
  for (const query of TEST_QUERIES) {
    await testRAGPipeline(query);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Test complete! Check results above.');
  console.log('\n📝 Next steps:');
  console.log('1. If functions are failing, configure Edge Function Secrets');
  console.log('2. If no data returned, run document import scripts');
  console.log('3. Test in frontend at http://localhost:8080');
}

// Run tests
main().catch(console.error);