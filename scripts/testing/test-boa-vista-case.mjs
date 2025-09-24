#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando criação de caso de teste - Bairro Boa Vista\n');

async function testBoaVistaCase() {
  try {
    const testCase = {
      question: 'Qual é o coeficiente de aproveitamento do bairro Boa Vista?',
      expected_answer: `Zona | Altura Máxima | Coef. básico | Coef. máximo
ZOT 04 | 18.0 | 2.0 |
ZOT 07 | 60.0 | 3.6 |
ZOT 08.3 - C | 90.0 | 3.6
ESPECIAL | 0.0 | 0.0 |`,
      category: 'zoneamento',
      difficulty: 'medium',
      tags: ['bairro', 'boa-vista', 'coeficiente', 'aproveitamento', 'zot'],
      is_active: true
    };

    console.log('📤 Enviando caso de teste sobre Boa Vista...');
    console.log('   Pergunta:', testCase.question);
    console.log('   Categoria:', testCase.category);
    console.log('   Dificuldade:', testCase.difficulty);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-add-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase)
    });

    const responseText = await response.text();
    console.log('\n📥 Status da resposta:', response.status);

    if (response.ok) {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log('\n✅ Caso de teste criado com sucesso!');
        console.log('   ID:', result.data?.id);
        console.log('   Test ID:', result.data?.test_id);
        console.log('   Categoria:', result.data?.category);
        console.log('   Complexity:', result.data?.complexity);
        console.log('   Keywords:', result.data?.expected_keywords?.join(', '));
      } else {
        console.log('\n❌ Erro:', result.error);
      }
    } else {
      console.log('\n❌ Erro HTTP:', response.statusText);
      console.log('   Detalhes:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar teste
testBoaVistaCase().then(() => {
  console.log('\n✨ Teste concluído!');
});