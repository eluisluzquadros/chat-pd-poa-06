#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando queries simples...\n');

async function testQuery(query) {
  console.log(`\n📝 Query: "${query}"`);
  
  try {
    // Testar com 'query' em vez de 'message'
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,  // Usando 'query' conforme a correção
        sessionId: `test-${Date.now()}`,
        userId: 'test-user',
        bypassCache: true
      })
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta:', data.response ? data.response.substring(0, 200) + '...' : 'Sem resposta');
      
      if (data.agentTrace) {
        const errors = data.agentTrace.filter(t => t.error || (t.result && t.result.error));
        if (errors.length > 0) {
          console.log('⚠️  Erros no trace:');
          errors.forEach(e => {
            const error = e.error || (e.result && e.result.error);
            console.log(`   - ${e.step}: ${error}`);
          });
        }
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', response.status);
      console.error('Detalhes:', errorText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

async function main() {
  // Testar queries básicas
  await testQuery('oi');
  await testQuery('olá');
  await testQuery('O que é o plano diretor?');
  await testQuery('Quais bairros existem?');
  
  console.log('\n\n✅ Teste concluído!');
}

main().catch(console.error);