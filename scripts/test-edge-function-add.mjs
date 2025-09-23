#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando Edge Function qa-add-test-case\n');

async function testAddTestCase() {
  try {
    const testCase = {
      question: 'Teste: Qual a altura máxima para construções em ZOT 02?',
      expected_answer: 'A altura máxima para construções em ZOT 02 é de 18 metros',
      category: 'zoneamento',
      difficulty: 'easy',
      tags: ['teste', 'zot', 'altura'],
      is_active: true
    };

    console.log('📤 Enviando caso de teste:', testCase);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-add-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase)
    });

    const responseText = await response.text();
    console.log('\n📥 Resposta (status):', response.status);
    console.log('📥 Resposta (body):', responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log('\n✅ Caso de teste criado com sucesso!');
        console.log('   ID:', result.data?.id);
        console.log('   Test ID:', result.data?.test_id);
        console.log('   Categoria:', result.data?.category);
      } else {
        console.log('\n❌ Erro:', result.error);
      }
    } else {
      console.log('\n❌ Erro HTTP:', response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar teste
testAddTestCase().then(() => {
  console.log('\n✨ Teste concluído!');
});