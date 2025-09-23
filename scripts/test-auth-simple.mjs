#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔑 Testando autenticação Supabase\n');

async function testAuth() {
  console.log('1. Testando com Bearer token:');
  
  const response1 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'teste',
      sessionId: 'auth-test'
    })
  });
  
  console.log('   Status:', response1.status);
  if (!response1.ok) {
    const text = await response1.text();
    console.log('   Erro:', text.substring(0, 100));
  } else {
    console.log('   ✅ Autenticação bem-sucedida!');
  }
  
  console.log('\n2. Testando com apikey header:');
  
  const response2 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'teste',
      sessionId: 'auth-test'
    })
  });
  
  console.log('   Status:', response2.status);
  if (!response2.ok) {
    const text = await response2.text();
    console.log('   Erro:', text.substring(0, 100));
  } else {
    console.log('   ✅ Autenticação bem-sucedida!');
  }
  
  console.log('\n3. Testando sem autenticação:');
  
  const response3 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'teste',
      sessionId: 'auth-test'
    })
  });
  
  console.log('   Status:', response3.status);
  const text3 = await response3.text();
  console.log('   Resposta:', text3.substring(0, 100));
}

testAuth().catch(console.error);