#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Testando health check do sistema RAG...\n');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const testQuery = 'health check';

async function testRAGHealth() {
  try {
    console.log('📡 Chamando agentic-rag...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'}`,
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: `health-check-${Date.now()}`,
        userRole: 'citizen'
      }),
    });

    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status}`);
      const errorText = await response.text();
      console.error('📝 Error body:', errorText.substring(0, 500));
      return false;
    }

    const data = await response.json();
    
    console.log('✅ Resposta recebida!');
    console.log('📝 Response:', data.response?.substring(0, 100) + '...');
    console.log('🎯 Confidence:', data.confidence);
    console.log('⏱️ Execution time:', data.executionTime + 'ms');
    
    if (data.agentTrace) {
      console.log('\n📋 Agent trace:');
      data.agentTrace.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.step}`);
      });
    }
    
    if (data.error) {
      console.error('❌ Error in response:', data.error);
      return false;
    }
    
    return true;

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

// Executar teste
testRAGHealth().then(success => {
  if (success) {
    console.log('\n🎉 Sistema RAG está funcionando!');
    process.exit(0);
  } else {
    console.log('\n💥 Sistema RAG apresentou problemas');
    process.exit(1);
  }
});