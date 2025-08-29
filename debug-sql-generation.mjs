#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔍 Debugando o fluxo de geração SQL...\n');

async function testQueryAnalysis(query) {
  console.log(`\n1️⃣ Query Analyzer para: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sessionId: 'test'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ Análise:');
      console.log(`      Intent: ${result.intent}`);
      console.log(`      Strategy: ${result.strategy}`);
      console.log(`      Bairros detectados: ${result.entities?.bairros?.join(', ') || 'nenhum'}`);
      console.log(`      Is construction query: ${result.isConstructionQuery}`);
      return result;
    } else {
      console.error('   ❌ Erro:', response.status);
      return null;
    }
  } catch (error) {
    console.error('   ❌ Erro:', error.message);
    return null;
  }
}

async function testSQLGeneration(query, analysisResult) {
  console.log(`\n2️⃣ SQL Generator para: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        analysisResult: analysisResult
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ SQL gerado:');
      console.log(`      Queries geradas: ${result.sqlQueries?.length || 0}`);
      
      if (result.sqlQueries && result.sqlQueries.length > 0) {
        result.sqlQueries.forEach((sql, i) => {
          console.log(`      Query ${i+1}: ${sql.substring(0, 100)}...`);
        });
      }
      
      console.log(`      Execution results: ${result.executionResults?.length || 0}`);
      
      if (result.executionResults && result.executionResults.length > 0) {
        result.executionResults.forEach((res, i) => {
          console.log(`      Result ${i+1}: ${res.data?.length || 0} registros`);
          if (res.data && res.data.length > 0) {
            console.log(`         Exemplo: ${res.data[0].bairro || res.data[0].Bairro} - ${res.data[0].zona || res.data[0].Zona}`);
          }
        });
      }
      
      return result;
    } else {
      const error = await response.text();
      console.error('   ❌ Erro:', error.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error('   ❌ Erro:', error.message);
    return null;
  }
}

async function testFullFlow(query) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTANDO: "${query}"`);
  console.log(`${'='.repeat(60)}`);
  
  // 1. Análise da query
  const analysisResult = await testQueryAnalysis(query);
  if (!analysisResult) return;
  
  // 2. Geração SQL
  const sqlResult = await testSQLGeneration(query, analysisResult);
  if (!sqlResult) return;
  
  // 3. Verificar dados diretamente
  console.log('\n3️⃣ Verificação direta no banco:');
  
  if (query.toLowerCase().includes('centro histórico')) {
    const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/regime_urbanistico?bairro=eq.CENTRO HISTÓRICO&select=bairro,zona&limit=5`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      }
    });
    
    if (directResponse.ok) {
      const data = await directResponse.json();
      console.log(`   ✅ Dados existem no banco: ${data.length} registros`);
      data.forEach(d => console.log(`      ${d.bairro} - ${d.zona}`));
    }
  }
}

async function main() {
  // Testar diferentes queries
  await testFullFlow('Quais são as zonas do Centro Histórico?');
  await testFullFlow('Liste todos os bairros de Porto Alegre');
  await testFullFlow('Qual a altura máxima no bairro Petrópolis?');
  
  console.log('\n\n📊 DIAGNÓSTICO:');
  console.log('- Se a análise detecta corretamente mas não gera SQL, problema no sql-generator');
  console.log('- Se gera SQL mas não retorna dados, problema na execução ou nos dados');
  console.log('- Se dados existem no banco mas não são retornados, problema no mapeamento de colunas');
}

main().catch(console.error);