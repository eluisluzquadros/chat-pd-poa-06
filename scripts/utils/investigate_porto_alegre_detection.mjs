// Investigar detecção de "PORTO ALEGRE" como bairro
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

async function investigate() {
  console.log('🔍 INVESTIGANDO DETECÇÃO DE "PORTO ALEGRE"\n');
  
  // Testar query-analyzer com "porto alegre"
  const testQuery = "Altura máxima da construção dos prédios em porto alegre";
  
  console.log(`Query: "${testQuery}"\n`);
  
  const response = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      query: testQuery,
      sessionId: 'investigate-' + Date.now()
    })
  });
  
  const analysis = await response.json();
  console.log('Análise completa:', JSON.stringify(analysis, null, 2));
  
  // Verificar se há algum bairro "PORTO ALEGRE" na base
  const supabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo');
  
  console.log('\n🔍 Verificando se existe bairro "PORTO ALEGRE" na base...');
  const { data: bairroData } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY')
    .eq('row_data->>Bairro', 'PORTO ALEGRE')
    .limit(5);
  
  console.log(`Encontrados: ${bairroData?.length || 0} registros com bairro "PORTO ALEGRE"`);
  
  // Verificar se o SQL generator está usando algum bairro padrão
  console.log('\n🔍 Testando SQL Generator...');
  const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      query: testQuery,
      analysisResult: analysis
    })
  });
  
  const sqlResult = await sqlResponse.json();
  console.log('\nSQL Queries geradas:');
  sqlResult.sqlQueries?.forEach((sq, i) => {
    console.log(`\nQuery ${i + 1}:`);
    console.log(sq.query);
    if (sq.query.includes('PETRÓP') || sq.query.includes('Petróp')) {
      console.log('⚠️  PROBLEMA: SQL contém referência a Petrópolis!');
    }
  });
  
  // Verificar últimas execuções que retornaram Petrópolis
  console.log('\n🔍 Verificando últimas execuções com Petrópolis...');
  const { data: executions } = await supabase
    .from('agent_executions')
    .select('user_query, intent_classification, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  const petropolisQueries = executions?.filter(exec => {
    const bairros = exec.intent_classification?.entities?.bairros || [];
    return bairros.includes('PETRÓPOLIS') || bairros.includes('Petrópolis');
  });
  
  console.log(`\nEncontradas ${petropolisQueries?.length || 0} execuções recentes com Petrópolis:`);
  petropolisQueries?.forEach(exec => {
    console.log(`- "${exec.user_query}"`);
    console.log(`  Bairros: ${JSON.stringify(exec.intent_classification?.entities?.bairros)}`);
  });
}

investigate().catch(console.error);