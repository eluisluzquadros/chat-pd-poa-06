// Teste completo do fluxo para CAVALHADA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

async function testFullFlow() {
  console.log('🔍 TESTE COMPLETO DO FLUXO - CAVALHADA\n');
  
  const query = "o que posso construir no cavalhada?";
  console.log(`Query: "${query}"\n`);
  
  // 1. Testar Query Analyzer
  console.log('1️⃣ QUERY ANALYZER');
  const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      query: query,
      sessionId: `test-flow-${Date.now()}`
    })
  });
  
  const analysis = await analysisResponse.json();
  console.log('Análise:', JSON.stringify(analysis, null, 2));
  
  // 2. Testar SQL Generator
  console.log('\n2️⃣ SQL GENERATOR');
  const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      query: query,
      analysisResult: analysis
    })
  });
  
  const sqlResult = await sqlResponse.json();
  console.log('SQL Result:', JSON.stringify(sqlResult, null, 2).substring(0, 1000));
  
  // 3. Executar SQL diretamente
  if (sqlResult.sqlQueries && sqlResult.sqlQueries.length > 0) {
    console.log('\n3️⃣ EXECUTANDO SQL DIRETAMENTE');
    
    const supabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo');
    
    // Testar query simplificada
    console.log('\nTestando query simplificada:');
    const { data: simpleData, error: simpleError } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .ilike('row_data->>Bairro', '%cavalhada%')
      .limit(3);
    
    if (simpleError) {
      console.log('Erro:', simpleError);
    } else {
      console.log(`Encontrados: ${simpleData?.length} registros`);
      if (simpleData && simpleData.length > 0) {
        console.log('Amostra:', simpleData[0].row_data);
      }
    }
  }
  
  // 4. Testar Response Synthesizer
  console.log('\n4️⃣ RESPONSE SYNTHESIZER');
  const synthesisResponse = await fetch(`${supabaseUrl}/functions/v1/response-synthesizer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      originalQuery: query,
      analysisResult: analysis,
      sqlResults: sqlResult
    })
  });
  
  const synthesis = await synthesisResponse.json();
  console.log('\nResposta final:');
  console.log(synthesis.response?.substring(0, 500));
  
  // 5. Verificar se há problema específico
  console.log('\n5️⃣ DIAGNÓSTICO');
  if (synthesis.response?.includes('não consegui localizar')) {
    console.log('❌ PROBLEMA: Resposta contém mensagem de erro');
    
    if (!sqlResult.executionResults || sqlResult.executionResults.length === 0) {
      console.log('   - SQL não retornou resultados');
    }
    
    if (sqlResult.error) {
      console.log('   - Erro no SQL:', sqlResult.error);
    }
    
    if (!analysis.isConstructionQuery) {
      console.log('   - Query não foi identificada como construção');
    }
  } else {
    console.log('✅ Resposta parece correta');
  }
}

testFullFlow().catch(console.error);