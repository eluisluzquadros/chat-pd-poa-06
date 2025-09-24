#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔍 Testando busca de detalhes de runs\n');
console.log('=' .repeat(60));

async function testGetRunDetails() {
  try {
    // First get the latest run
    const runsResponse = await fetch(`${SUPABASE_URL}/rest/v1/qa_validation_runs?select=id,model,status&order=started_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    
    const runs = await runsResponse.json();
    
    if (runs && runs.length > 0) {
      const latestRun = runs[0];
      console.log(`📊 Buscando detalhes da run: ${latestRun.id}`);
      console.log(`   Modelo: ${latestRun.model}`);
      console.log(`   Status: ${latestRun.status}\n`);
      
      // Get detailed results
      const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-get-run-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ runId: latestRun.id })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const details = result.data;
        console.log('✅ Detalhes recuperados com sucesso!\n');
        console.log(`📈 Resumo da Run:`);
        console.log(`   Total de testes: ${details.totalTests}`);
        console.log(`   Testes aprovados: ${details.passedTests}`);
        console.log(`   Acurácia geral: ${(details.overallAccuracy * 100).toFixed(1)}%`);
        console.log(`   Tempo médio: ${details.avgResponseTime}ms\n`);
        
        if (details.results && details.results.length > 0) {
          console.log(`📝 Primeiros 3 resultados:`);
          details.results.slice(0, 3).forEach((result, idx) => {
            console.log(`\n   ${idx + 1}. ${result.question?.substring(0, 50)}...`);
            console.log(`      Sucesso: ${result.success ? '✅' : '❌'}`);
            console.log(`      Acurácia: ${(result.accuracy * 100).toFixed(1)}%`);
            console.log(`      Tempo: ${result.responseTime}ms`);
          });
        }
      } else {
        console.log('❌ Erro ao buscar detalhes:', result.error);
      }
    } else {
      console.log('⚠️ Nenhuma run encontrada no banco de dados');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testGetRunDetails().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Teste finalizado!');
}).catch(console.error);