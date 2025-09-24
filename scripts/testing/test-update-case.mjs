#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando Edge Function qa-update-test-case\n');

async function testUpdateTestCase() {
  try {
    // Usar o ID 561 que criamos anteriormente (Boa Vista)
    const updateData = {
      id: '561',
      question: 'Qual é o coeficiente de aproveitamento do bairro Boa Vista? (ATUALIZADO)',
      expected_answer: `O bairro Boa Vista possui diferentes coeficientes de aproveitamento conforme a zona:
- ZOT 04: Coeficiente básico de 2.0, altura máxima de 18m
- ZOT 07: Coeficiente básico de 3.6, altura máxima de 60m  
- ZOT 08.3-C: Coeficiente básico de 3.6, altura máxima de 90m
- Zona Especial: Coeficiente 0.0 (área não edificável)`,
      category: 'zoneamento',
      difficulty: 'medium',
      tags: ['bairro', 'boa-vista', 'coeficiente', 'aproveitamento', 'zot', 'atualizado'],
      is_active: true
    };

    console.log('📤 Atualizando caso de teste ID:', updateData.id);
    console.log('   Nova pergunta:', updateData.question);
    console.log('   Categoria:', updateData.category);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-update-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const responseText = await response.text();
    console.log('\n📥 Status da resposta:', response.status);

    if (response.ok) {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log('\n✅ Caso de teste atualizado com sucesso!');
        console.log('   ID:', result.data?.id);
        console.log('   Test ID:', result.data?.test_id);
        console.log('   Versão:', result.data?.version);
        console.log('   Complexity:', result.data?.complexity);
        console.log('   Tags:', result.data?.tags?.join(', '));
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
testUpdateTestCase().then(() => {
  console.log('\n✨ Teste de atualização concluído!');
});