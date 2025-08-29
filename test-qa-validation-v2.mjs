#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎯 Testando sistema de validação QA v2 com múltiplos modelos\n');
console.log('=' .repeat(60));

async function testQAValidationV2() {
  console.log('📊 Executando validação QA com Edge Function v2...\n');
  
  try {
    // Testar com 3 casos aleatórios e apenas um modelo por enquanto
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'random',
        randomCount: 3,
        models: ['agentic-rag'], // Poderia ser múltiplos: ['agentic-rag', 'openai/gpt-3.5-turbo']
        includeSQL: false,
        excludeSQL: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na validação:', error);
      return;
    }

    const result = await response.json();
    
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
          
          if (run.results && run.results.length > 0) {
            console.log('   Detalhes dos Testes:');
            run.results.forEach((test, idx) => {
              const status = test.success ? '✅' : '❌';
              console.log(`   ${idx + 1}. ${status} ${test.question.substring(0, 60)}...`);
              console.log(`      Acurácia: ${(test.accuracy * 100).toFixed(1)}%`);
              console.log(`      Tempo: ${test.responseTime}ms`);
              if (!test.success && test.actualAnswer) {
                console.log(`      Resposta: ${test.actualAnswer.substring(0, 100)}...`);
              }
              if (test.error) {
                console.log(`      Erro: ${test.error}`);
              }
            });
            console.log('');
          }
        });
      }
      
      // Análise de performance
      if (result.runs && result.runs.length > 1) {
        console.log('🏆 Comparação entre Modelos:');
        const sorted = [...result.runs].sort((a, b) => b.overallAccuracy - a.overallAccuracy);
        sorted.forEach((run, idx) => {
          console.log(`   ${idx + 1}º lugar: ${run.model} - ${(run.overallAccuracy * 100).toFixed(1)}% de acurácia`);
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
testQAValidationV2().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Teste de validação QA v2 finalizado!');
}).catch(console.error);