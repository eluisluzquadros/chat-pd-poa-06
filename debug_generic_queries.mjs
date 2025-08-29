import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Queries problemáticas que ainda retornam Petrópolis
const problematicQueries = [
  "Como poderá ser feito a flexibilizaçao de Recuo de jardim?",
  "qual a altura máxima permitida?"
];

console.log('🔍 Debug de queries genéricas sem contexto...\n');

for (const query of problematicQueries) {
  console.log(`\n📝 Query: "${query}"`);
  console.log('=' * 60);
  
  try {
    // Primeiro, analisar a query
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
      body: { query }
    });

    if (analysisError) {
      console.error('❌ Erro na análise:', analysisError);
      continue;
    }

    console.log('\n📊 Análise da query:');
    console.log(JSON.stringify(analysisData, null, 2));
    
    // Verificar especificamente o que está sendo detectado
    console.log('\n🔎 Detalhes importantes:');
    console.log('- Intent:', analysisData.intent);
    console.log('- Strategy:', analysisData.strategy);
    console.log('- Bairros:', analysisData.entities?.bairros || []);
    console.log('- isConstructionQuery:', analysisData.isConstructionQuery);
    console.log('- requiredDatasets:', analysisData.requiredDatasets);
    
    // Se não há bairros e é construction query, isso pode ser o problema
    if (analysisData.isConstructionQuery && (!analysisData.entities?.bairros || analysisData.entities.bairros.length === 0)) {
      console.log('\n⚠️  ALERTA: Query de construção sem bairro especificado!');
      console.log('Isso pode fazer o sistema usar dados de um bairro padrão.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  }
}

console.log('\n\n🏁 Debug concluído!');