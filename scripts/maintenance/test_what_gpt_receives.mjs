import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

const testQuery = "qual a altura máxima permitida?";

console.log('🔍 Analisando o que está sendo enviado ao GPT...\n');

try {
  // 1. Análise
  const { data: analysisData } = await supabase.functions.invoke('query-analyzer', {
    body: { query: testQuery }
  });
  
  // 2. SQL Generator
  const { data: sqlData } = await supabase.functions.invoke('sql-generator', {
    body: { 
      query: testQuery,
      analysisResult: analysisData
    }
  });
  
  console.log('📊 SQL Gerado:');
  sqlData.sqlQueries?.forEach((sq, idx) => {
    console.log(`Query ${idx + 1}: ${sq.query}`);
  });
  
  // Verificar se as queries SQL retornam dados de Petrópolis
  if (sqlData.executionResults && sqlData.executionResults.length > 0) {
    console.log('\n📋 Dados retornados pelo SQL:');
    const firstResults = sqlData.executionResults[0].data?.slice(0, 5);
    console.log('Primeiros 5 registros:');
    firstResults?.forEach(row => {
      if (row.Bairro) {
        console.log(`- Bairro: ${row.Bairro}, ZOT: ${row.zona || row.Zona}`);
      } else {
        console.log(`- ZOT: ${row.zona || row.Zona}, Altura: ${row.altura_maxima}`);
      }
    });
    
    // Verificar se Petrópolis aparece nos primeiros resultados
    const hasPatropolis = sqlData.executionResults[0].data?.some(row => 
      row.Bairro?.includes('PETRÓPOLIS') || row.Bairro?.includes('PETROPOLIS')
    );
    
    if (hasPatropolis) {
      console.log('\n⚠️  ALERTA: Petrópolis aparece nos dados SQL!');
    }
  }
  
} catch (error) {
  console.error('❌ Erro:', error);
}