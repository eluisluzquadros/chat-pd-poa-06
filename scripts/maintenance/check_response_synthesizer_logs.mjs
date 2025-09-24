import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Testar uma query problemática com mais detalhes
const testQuery = "qual a altura máxima permitida?";

console.log('🔍 Verificando fluxo completo para:', testQuery);
console.log('=' * 60);

try {
  // 1. Análise da query
  console.log('\n1️⃣ ANÁLISE DA QUERY:');
  const { data: analysisData } = await supabase.functions.invoke('query-analyzer', {
    body: { query: testQuery }
  });
  
  console.log('- Intent:', analysisData.intent);
  console.log('- Bairros:', analysisData.entities?.bairros || []);
  console.log('- isConstructionQuery:', analysisData.isConstructionQuery);
  console.log('- requiredDatasets:', analysisData.requiredDatasets);
  
  // 2. Geração SQL (se houver datasets)
  if (analysisData.requiredDatasets?.length > 0) {
    console.log('\n2️⃣ GERAÇÃO SQL:');
    const { data: sqlGenData } = await supabase.functions.invoke('sql-generator', {
      body: { 
        query: testQuery,
        analysisResult: analysisData
      }
    });
    
    console.log('Queries SQL geradas:');
    sqlGenData.sqlQueries?.forEach((sq, idx) => {
      console.log(`\nQuery ${idx + 1}:`);
      console.log('Dataset:', sq.dataset_id);
      console.log('Purpose:', sq.purpose);
      console.log('SQL:', sq.query.substring(0, 200) + '...');
    });
  }
  
  // 3. Resposta final
  console.log('\n3️⃣ RESPOSTA FINAL:');
  const { data: responseData } = await supabase.functions.invoke('agentic-rag', {
    body: { 
      message: testQuery,
      bypassCache: true
    }
  });
  
  const response = responseData.response;
  console.log('\nResposta (primeiras linhas):');
  const lines = response.split('\n').slice(0, 10);
  lines.forEach((line, idx) => {
    console.log(`${idx + 1}: ${line}`);
  });
  
  // Verificar menções a Petrópolis
  if (response.toLowerCase().includes('petrópolis')) {
    console.log('\n⚠️  PROBLEMA: Resposta menciona Petrópolis!');
  } else {
    console.log('\n✅ OK: Resposta não menciona Petrópolis');
  }
  
} catch (error) {
  console.error('❌ Erro:', error);
}