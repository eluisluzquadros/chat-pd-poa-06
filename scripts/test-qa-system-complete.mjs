#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔍 Teste completo do sistema QA\n');
console.log('=' .repeat(60));

async function testCompleteSystem() {
  try {
    // 1. Test fetching runs
    console.log('1️⃣ Testando busca de runs...');
    const fetchRunsResponse = await fetch(`${SUPABASE_URL}/functions/v1/qa-fetch-runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limit: 5 })
    });
    
    const runsData = await fetchRunsResponse.json();
    
    if (runsData.success) {
      console.log(`   ✅ ${runsData.runs.length} runs encontradas`);
      console.log(`   ✅ ${runsData.testCases.length} casos de teste encontrados\n`);
      
      if (runsData.runs.length > 0) {
        const firstRun = runsData.runs[0];
        console.log(`2️⃣ Testando busca de detalhes da run: ${firstRun.id}`);
        console.log(`   Modelo: ${firstRun.model}`);
        console.log(`   Status: ${firstRun.status}\n`);
        
        // 2. Test fetching run details
        const detailsResponse = await fetch(`${SUPABASE_URL}/functions/v1/qa-get-run-details`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ runId: firstRun.id })
        });
        
        const detailsData = await detailsResponse.json();
        
        if (detailsData.success && detailsData.data) {
          const details = detailsData.data;
          console.log(`   ✅ Detalhes recuperados com sucesso!`);
          console.log(`   Total de testes: ${details.totalTests}`);
          console.log(`   Testes com resultados: ${details.results.length}`);
          console.log(`   Acurácia: ${(details.overallAccuracy * 100).toFixed(1)}%\n`);
          
          if (details.results.length > 0) {
            console.log(`   📝 Exemplo de resultado:`);
            const firstResult = details.results[0];
            console.log(`      Pergunta: ${firstResult.question?.substring(0, 50)}...`);
            console.log(`      Sucesso: ${firstResult.success ? '✅' : '❌'}`);
            console.log(`      Acurácia: ${(firstResult.accuracy * 100).toFixed(1)}%`);
          }
        } else {
          console.log('   ❌ Erro ao buscar detalhes:', detailsData.error);
        }
      }
    } else {
      console.log('   ❌ Erro ao buscar runs:', runsData.error);
    }
    
    // 3. Test validation execution
    console.log('\n3️⃣ Testando execução de validação...');
    const validationResponse = await fetch(`${SUPABASE_URL}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'random',
        randomCount: 1,
        models: ['openai/gpt-3.5-turbo'],
        includeSQL: false
      })
    });
    
    const validationData = await validationResponse.json();
    
    if (validationData.success) {
      console.log('   ✅ Validação executada com sucesso!');
      console.log(`   Run ID: ${validationData.runs[0].runId}`);
      console.log(`   Status: ${validationData.runs[0].status}`);
    } else {
      console.log('   ❌ Erro na validação:', validationData.error);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testCompleteSystem().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Teste completo finalizado!');
  console.log('\n📌 Dashboard deve estar acessível em: http://localhost:8081/admin/quality');
}).catch(console.error);