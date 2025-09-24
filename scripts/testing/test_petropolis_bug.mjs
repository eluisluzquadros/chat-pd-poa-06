// Teste urgente - Bug Petrópolis
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

async function testPetropolisBug() {
  console.log('🚨 TESTE URGENTE - BUG PETRÓPOLIS\n');
  
  const problematicQueries = [
    'Altura máxima da construção dos prédios em porto alegre',
    'Como poderá ser feito a flexibilizaçao de Recuo de jardim?',
    'quais as medidas para evitar enchentes do plano diretor?',
    'qual a altura máxima permitida?',
    'coeficiente de aproveitamento em porto alegre'
  ];
  
  console.log('🔍 Testando queries problemáticas...\n');
  
  for (const query of problematicQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    // 1. Testar query-analyzer
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        query: query,
        sessionId: `bug-test-${Date.now()}`
      })
    });
    
    const analysis = await analysisResponse.json();
    console.log('📊 Análise:');
    console.log(`  - Intent: ${analysis.intent}`);
    console.log(`  - Bairros detectados: ${JSON.stringify(analysis.entities?.bairros || [])}`);
    console.log(`  - isConstructionQuery: ${analysis.isConstructionQuery}`);
    
    // 2. Testar resposta completa
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        message: query,
        sessionId: `bug-test-${Date.now()}`,
        bypassCache: true
      })
    });
    
    const result = await response.json();
    
    // Verificar se contém "Petrópolis"
    const containsPetropolis = result.response?.toLowerCase().includes('petrópolis') || 
                              result.response?.toLowerCase().includes('petropolis');
    
    console.log(`  - Contém "Petrópolis": ${containsPetropolis ? '❌ SIM' : '✅ NÃO'}`);
    
    if (containsPetropolis) {
      console.log('  ⚠️  PROBLEMA DETECTADO!');
      // Extrair trecho que menciona Petrópolis
      const start = result.response.toLowerCase().indexOf('petróp');
      if (start !== -1) {
        console.log(`  Preview: "...${result.response.substring(Math.max(0, start - 50), start + 100)}..."`);
      }
    }
    
    // Pequena pausa
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Verificar cache
  console.log('\n\n🔍 Verificando cache suspeito...');
  const supabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo');
  
  const { data: cacheEntries } = await supabase
    .from('query_cache')
    .select('query, response')
    .ilike('response', '%petrópolis%')
    .limit(10);
  
  console.log(`\n📊 Encontradas ${cacheEntries?.length || 0} entradas em cache com "Petrópolis":`);
  cacheEntries?.forEach(entry => {
    console.log(`- "${entry.query}"`);
  });
}

testPetropolisBug().catch(console.error);