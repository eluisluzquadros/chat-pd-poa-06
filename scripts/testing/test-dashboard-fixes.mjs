#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando correções do dashboard administrativo\n');

// Teste 1: Criar um novo caso de teste
async function testCreateTestCase() {
  console.log('📝 Teste 1: Criando novo caso de teste...');
  
  const testCase = {
    test_id: `test_dashboard_${Date.now()}`,
    query: 'Qual o coeficiente de aproveitamento para ZOT 05?',
    question: 'Qual o coeficiente de aproveitamento para ZOT 05?',
    expected_keywords: ['coeficiente', 'aproveitamento', 'zot', '05'],
    expected_answer: 'O coeficiente de aproveitamento para ZOT 05 é 1.5',
    expected_response: 'O coeficiente de aproveitamento para ZOT 05 é 1.5',
    category: 'zoneamento',
    complexity: 'easy',
    min_response_length: 50,
    is_active: true,
    tags: ['zoneamento', 'coeficiente', 'teste'],
    is_sql_related: false,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/qa_test_cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao criar caso de teste:', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Caso de teste criado com sucesso!');
    console.log('   ID:', data[0]?.id);
    console.log('   Test ID:', data[0]?.test_id);
    return true;
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

// Teste 2: Buscar casos de teste
async function testFetchTestCases() {
  console.log('\n📋 Teste 2: Buscando casos de teste...');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/qa_test_cases?is_active=eq.true&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao buscar casos de teste:', error);
      return false;
    }

    const data = await response.json();
    console.log(`✅ ${data.length} casos de teste encontrados`);
    
    data.forEach((tc, idx) => {
      console.log(`\n   ${idx + 1}. ${tc.question || tc.query}`);
      console.log(`      Categoria: ${tc.category}`);
      console.log(`      Complexidade: ${tc.complexity || tc.difficulty}`);
      console.log(`      Tags: ${tc.tags?.join(', ') || 'Sem tags'}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

// Teste 3: Simular execução de validação
async function testValidationExecution() {
  console.log('\n🚀 Teste 3: Simulando execução de validação...');
  
  // Criar um run de validação
  const validationRun = {
    id: `run_${Date.now()}`,
    model: 'agentic-rag',
    total_tests: 10,
    passed_tests: 0,
    overall_accuracy: 0,
    avg_response_time_ms: 0,
    status: 'running',
    started_at: new Date().toISOString(),
    parameters: {
      mode: 'random',
      count: 10
    }
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/qa_validation_runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(validationRun)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao criar run de validação:', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Run de validação criada com sucesso!');
    console.log('   Run ID:', data[0]?.id);
    console.log('   Status:', data[0]?.status);
    
    // Simular atualização após 2 segundos
    setTimeout(async () => {
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/qa_validation_runs?id=eq.${data[0].id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            status: 'completed',
            passed_tests: 7,
            overall_accuracy: 0.7,
            avg_response_time_ms: 2500,
            completed_at: new Date().toISOString()
          })
        }
      );
      
      if (updateResponse.ok) {
        console.log('   ✅ Run atualizada para status: completed');
      }
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runTests() {
  console.log('🎯 Iniciando testes do dashboard administrativo\n');
  console.log('=' .repeat(50));
  
  const results = [];
  
  results.push(await testCreateTestCase());
  results.push(await testFetchTestCases());
  results.push(await testValidationExecution());
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Resumo dos Testes:');
  console.log(`   ✅ Sucesso: ${results.filter(r => r).length}`);
  console.log(`   ❌ Falhas: ${results.filter(r => !r).length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 Todos os testes passaram com sucesso!');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
}

// Executar
runTests().catch(console.error);