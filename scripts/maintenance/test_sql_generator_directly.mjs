import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

const testQuery = "qual a altura máxima permitida?";

console.log('🔍 Testando sql-generator diretamente para:', testQuery);
console.log('=' * 60);

try {
  // 1. Primeiro obter análise
  const { data: analysisData } = await supabase.functions.invoke('query-analyzer', {
    body: { query: testQuery }
  });
  
  console.log('\n📊 Análise:');
  console.log('- Bairros:', analysisData.entities?.bairros || []);
  console.log('- isConstructionQuery:', analysisData.isConstructionQuery);
  console.log('- requiredDatasets:', analysisData.requiredDatasets);
  
  // 2. Chamar sql-generator
  console.log('\n📝 Chamando sql-generator...');
  const { data: sqlData, error: sqlError } = await supabase.functions.invoke('sql-generator', {
    body: { 
      query: testQuery,
      analysisResult: analysisData
    }
  });
  
  if (sqlError) {
    console.error('❌ Erro no sql-generator:', sqlError);
  } else {
    console.log('\n✅ Resposta do sql-generator:');
    console.log('Queries geradas:', sqlData.sqlQueries?.length || 0);
    
    sqlData.sqlQueries?.forEach((sq, idx) => {
      console.log(`\nQuery ${idx + 1}:`);
      console.log('Purpose:', sq.purpose);
      console.log('SQL:', sq.query);
      
      // Verificar se menciona Petrópolis
      if (sq.query.includes('PETRÓPOLIS') || sq.query.includes('Petrópolis')) {
        console.log('⚠️  PROBLEMA: Query menciona Petrópolis!');
      }
    });
  }
  
} catch (error) {
  console.error('❌ Erro:', error);
}