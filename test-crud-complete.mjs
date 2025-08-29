#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Teste Completo CRUD - Casos de Teste QA\n');
console.log('=' .repeat(60));

let createdTestCaseId = null;

async function createTestCase() {
  console.log('\n📝 1. CREATE - Criando novo caso de teste...');
  
  const testCase = {
    question: 'TESTE CRUD: Qual a diferença entre ZOT e ZIS?',
    expected_answer: 'ZOT significa Zona de Ordenamento Territorial e ZIS significa Zona de Interesse Social',
    category: 'zoneamento',
    difficulty: 'easy',
    tags: ['teste', 'crud', 'zot', 'zis'],
    is_active: true
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-add-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      createdTestCaseId = result.data.id;
      console.log('   ✅ Criado com sucesso! ID:', createdTestCaseId);
      return true;
    } else {
      console.log('   ❌ Erro:', result.error);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Erro:', error.message);
    return false;
  }
}

async function updateTestCase() {
  if (!createdTestCaseId) {
    console.log('\n⚠️ 2. UPDATE - Pulando (sem ID para atualizar)');
    return false;
  }

  console.log(`\n✏️ 2. UPDATE - Atualizando caso de teste ID ${createdTestCaseId}...`);
  
  const updateData = {
    id: createdTestCaseId.toString(),
    question: 'TESTE CRUD (ATUALIZADO): Qual a diferença entre ZOT e ZIS?',
    expected_answer: 'ZOT (Zona de Ordenamento Territorial) define regras de ocupação urbana, enquanto ZIS (Zona de Interesse Social) são áreas destinadas à habitação de interesse social',
    category: 'zoneamento',
    difficulty: 'medium',
    tags: ['teste', 'crud', 'zot', 'zis', 'atualizado'],
    is_active: true
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-update-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('   ✅ Atualizado com sucesso!');
      console.log('   Versão:', result.data.version);
      return true;
    } else {
      console.log('   ❌ Erro:', result.error);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Erro:', error.message);
    return false;
  }
}

async function deleteTestCase() {
  if (!createdTestCaseId) {
    console.log('\n⚠️ 3. DELETE - Pulando (sem ID para excluir)');
    return false;
  }

  console.log(`\n🗑️ 3. DELETE - Excluindo caso de teste ID ${createdTestCaseId}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-delete-test-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: createdTestCaseId.toString() })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('   ✅ Excluído com sucesso!');
      return true;
    } else {
      console.log('   ❌ Erro:', result.error);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Erro:', error.message);
    return false;
  }
}

// Executar testes em sequência
async function runCRUDTests() {
  const results = [];
  
  // CREATE
  results.push(await createTestCase());
  
  // UPDATE
  results.push(await updateTestCase());
  
  // DELETE
  results.push(await deleteTestCase());
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Resumo dos Testes CRUD:');
  console.log(`   CREATE: ${results[0] ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`   UPDATE: ${results[1] ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`   DELETE: ${results[2] ? '✅ Sucesso' : '❌ Falhou'}`);
  
  const allPassed = results.every(r => r);
  console.log(`\n${allPassed ? '🎉 Todos os testes passaram!' : '⚠️ Alguns testes falharam'}`);
}

// Executar
runCRUDTests().catch(console.error);