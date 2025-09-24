#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔍 Testando SQL Generator diretamente...\n');

async function testSQLGenerator() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: "Quais são as zonas do Centro Histórico?",
      analysisResult: {
        intent: "tabular",
        strategy: "structured_only",
        entities: {
          bairros: ["CENTRO HISTÓRICO"]
        },
        isConstructionQuery: true
      }
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Resposta completa:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificar estrutura
    console.log('\n📊 Análise da resposta:');
    console.log('- sqlQueries é array?', Array.isArray(result.sqlQueries));
    console.log('- Tipo do primeiro elemento:', typeof result.sqlQueries?.[0]);
    console.log('- executionResults tem dados?', result.executionResults?.length > 0);
    
    if (result.executionResults && result.executionResults.length > 0) {
      const firstResult = result.executionResults[0];
      console.log('- Primeiro resultado tem', firstResult.data?.length || 0, 'registros');
    }
  } else {
    console.error('Erro:', response.status);
    const text = await response.text();
    console.error(text);
  }
}

testSQLGenerator().catch(console.error);