#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎯 Testando sistema de validação QA corrigido\n');
console.log('=' .repeat(60));

async function testQAValidation() {
  console.log('📊 Executando validação QA com múltiplos modelos...\n');
  
  try {
    // Testar com 2 casos e 2 modelos diferentes
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'random',
        randomCount: 2,
        models: ['agentic-rag', 'openai/gpt-3.5-turbo'],
        includeSQL: false,
        excludeSQL: false
      })
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Erro na validação:', responseText);
      return;
    }

    const result = JSON.parse(responseText);
    
    if (result.success) {
      console.log('✅ Validação concluída com sucesso!\n');
      
      // Mostrar resumo geral
      if (result.summary) {
        console.log('📈 Resumo Geral:');
        console.log(`   Modelos testados: ${result.summary.totalModels}`);
        console.log(`   Total de testes executados: ${result.summary.totalTestsRun}`);
        console.log(`   Total de testes aprovados: ${result.summary.totalPassed}`);
        console.log(`   Taxa de sucesso média: ${(result.summary.avgAccuracy * 100).toFixed(1)}%`);
        console.log(`   Tempo médio de resposta: ${result.summary.avgResponseTime?.toFixed(0)}ms`);
        console.log(`   Tempo de execução total: ${result.summary.executionTime}ms\n`);
      }
      
      // Mostrar resultados por modelo
      if (result.runs && result.runs.length > 0) {
        console.log('📝 Resultados por Modelo:\n');
        
        result.runs.forEach((run, modelIdx) => {
          console.log(`${modelIdx + 1}. Modelo: ${run.model}`);
          console.log(`   Run ID: ${run.runId}`);
          console.log(`   Status: ${run.status}`);
          console.log(`   Testes executados: ${run.totalTests}`);
          console.log(`   Testes aprovados: ${run.passedTests}`);
          console.log(`   Taxa de sucesso: ${(run.overallAccuracy * 100).toFixed(1)}%`);
          console.log(`   Tempo médio: ${run.avgResponseTime?.toFixed(0)}ms\n`);
        });
      }
      
    } else {
      console.log('❌ Erro na validação:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar validação:', error.message);
  }
}

// Executar teste
testQAValidation().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Teste de validação QA finalizado!');
}).catch(console.error);