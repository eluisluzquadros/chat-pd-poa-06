#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔍 Testando com debug detalhado...\n');

async function testQuery(query) {
  console.log(`\n📝 Query: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sessionId: `test-${Date.now()}`,
        bypassCache: true
      })
    });
    
    console.log(`Status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.debugLog) {
      console.log('\n🐛 DEBUG LOG:');
      data.debugLog.forEach(log => {
        console.log(`  ${log.step}:`, JSON.stringify(log, null, 2));
      });
    }
    
    if (data.response) {
      console.log('\n✅ Resposta:', data.response.substring(0, 200) + '...');
    }
    
    if (data.error) {
      console.log('\n❌ Erro:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function main() {
  await testQuery('Quais são as zonas do Centro Histórico?');
}

main().catch(console.error);