#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎯 Testando sistema completo de validação QA\n');
console.log('=' .repeat(60));

async function testQAValidation() {
  console.log('📊 Executando validação QA com Edge Function...\n');
  
  try {
    // Testar com 5 casos aleatórios
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-execute-validation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'random',
        randomCount: 5,
        model: 'agentic-rag'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na validação:', error);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Validação concluída com sucesso!\n');
    console.log('📈 Resumo dos Resultados:');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Total de testes: ${result.totalTests}`);
    console.log(`   Testes aprovados: ${result.passedTests}`);
    console.log(`   Taxa de sucesso: ${(result.overallAccuracy * 100).toFixed(1)}%`);
    console.log(`   Tempo médio de resposta: ${result.avgResponseTime?.toFixed(0)}ms\n`);
    
    if (result.results && result.results.length > 0) {
      console.log('📝 Detalhes dos Testes:\n');
      result.results.forEach((test, idx) => {
        const status = test.success ? '✅' : '❌';
        console.log(`   ${idx + 1}. ${status} ${test.question}`);
        console.log(`      Acurácia: ${(test.accuracy * 100).toFixed(1)}%`);
        console.log(`      Tempo: ${test.responseTime}ms`);
        if (test.error) {
          console.log(`      Erro: ${test.error}`);
        }
        console.log('');
      });
    }
    
    // Buscar os resultados salvos no banco
    console.log('📊 Verificando resultados salvos no banco...\n');
    const runsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/qa_validation_runs?id=eq.${result.runId}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (runsResponse.ok) {
      const runs = await runsResponse.json();
      if (runs.length > 0) {
        const run = runs[0];
        console.log('✅ Run de validação salva no banco:');
        console.log(`   Status: ${run.status}`);
        console.log(`   Modelo: ${run.model}`);
        console.log(`   Testes passados: ${run.passed_tests}/${run.total_tests}`);
        console.log(`   Acurácia geral: ${(run.overall_accuracy * 100).toFixed(1)}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar validação:', error.message);
  }
}

// Executar teste
testQAValidation().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Teste completo de validação QA finalizado!');
}).catch(console.error);