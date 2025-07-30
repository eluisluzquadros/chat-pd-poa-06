// Limpar cache restante de Petrópolis
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearRemainingCache() {
  console.log('🧹 LIMPEZA FINAL DE CACHE PETRÓPOLIS\n');
  
  // Queries específicas que ainda têm problema
  const problematicQueries = [
    'como poderá ser feito a flexibilizaçao de recuo de jardim?',
    'qual a altura máxima permitida?',
    'quais as medidas para evitar enchentes do plano diretor?'
  ];
  
  console.log('1️⃣ Deletando queries específicas problemáticas...');
  
  for (const query of problematicQueries) {
    const { error } = await supabase
      .from('query_cache')
      .delete()
      .ilike('query', `%${query}%`);
    
    if (!error) {
      console.log(`✅ Limpo: "${query}"`);
    } else {
      console.log(`❌ Erro ao limpar: "${query}"`, error);
    }
  }
  
  // Limpar TODAS as queries que têm Petrópolis na resposta mas não na pergunta
  console.log('\n2️⃣ Limpando TODAS as queries com Petrópolis incorreto...');
  
  const { data: allPetropolis, error: searchError } = await supabase
    .from('query_cache')
    .select('key, query')
    .ilike('response', '%petrópolis%');
  
  if (!searchError && allPetropolis) {
    console.log(`\nEncontradas ${allPetropolis.length} entradas com Petrópolis`);
    
    // Filtrar apenas as que NÃO mencionam Petrópolis na query
    const toDelete = allPetropolis.filter(entry => {
      const queryLower = entry.query.toLowerCase();
      return !queryLower.includes('petrópolis') && !queryLower.includes('petropolis');
    });
    
    console.log(`${toDelete.length} são incorretas (não mencionam Petrópolis na pergunta)`);
    
    if (toDelete.length > 0) {
      const keysToDelete = toDelete.map(e => e.key);
      
      const { error: deleteError } = await supabase
        .from('query_cache')
        .delete()
        .in('key', keysToDelete);
      
      if (!deleteError) {
        console.log(`✅ ${toDelete.length} entradas deletadas com sucesso`);
      } else {
        console.log('❌ Erro ao deletar:', deleteError);
      }
    }
  }
  
  // Testar novamente
  console.log('\n\n3️⃣ TESTANDO APÓS LIMPEZA...\n');
  
  const testQuery = 'qual a altura máxima permitida?';
  
  const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    },
    body: JSON.stringify({
      message: testQuery,
      sessionId: `final-test-${Date.now()}`,
      bypassCache: true
    })
  });
  
  const result = await response.json();
  const hasPetropolis = result.response?.toLowerCase().includes('petrópolis');
  
  console.log(`Query: "${testQuery}"`);
  console.log(`Resultado: ${hasPetropolis ? '❌ AINDA COM PETRÓPOLIS' : '✅ CORRIGIDO'}`);
  
  if (!hasPetropolis) {
    console.log('\n✅ SUCESSO! O problema foi resolvido.');
    console.log('Preview:', result.response.substring(0, 200) + '...');
  } else {
    console.log('\n⚠️  O problema persiste para queries muito genéricas.');
    console.log('Isso pode ocorrer quando o sistema não consegue determinar o contexto.');
  }
  
  console.log('\n📋 RECOMENDAÇÃO FINAL:');
  console.log('- Para queries genéricas, seja mais específico');
  console.log('- Ex: "qual a altura máxima permitida no plano diretor?"');
  console.log('- Ex: "quais são as alturas máximas das ZOTs?"');
}

clearRemainingCache().catch(console.error);