// Script urgente para limpar cache de CAVALHADA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearCavalhadaCache() {
  console.log('🚨 LIMPEZA URGENTE DE CACHE - CAVALHADA\n');
  
  // 1. Buscar todas as queries relacionadas a CAVALHADA
  const { data: cacheEntries, error: searchError } = await supabase
    .from('query_cache')
    .select('key, query, created_at')
    .or('query.ilike.*cavalhada*,query.ilike.*CAVALHADA*');
  
  if (searchError) {
    console.error('Erro ao buscar cache:', searchError);
    return;
  }
  
  console.log(`📊 Encontradas ${cacheEntries?.length || 0} entradas em cache:`);
  cacheEntries?.forEach(entry => {
    console.log(`- "${entry.query}" (criado em: ${entry.created_at})`);
  });
  
  // 2. Deletar TODAS as entradas relacionadas
  if (cacheEntries && cacheEntries.length > 0) {
    console.log('\n🗑️  Deletando entradas...');
    
    const { error: deleteError } = await supabase
      .from('query_cache')
      .delete()
      .or('query.ilike.*cavalhada*,query.ilike.*CAVALHADA*');
    
    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
    } else {
      console.log('✅ Cache limpo com sucesso!');
    }
  }
  
  // 3. Testar a query diretamente
  console.log('\n🧪 Testando query "o que posso construir no bairro CAVALHADA?"...\n');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    },
    body: JSON.stringify({
      message: 'o que posso construir no bairro CAVALHADA?',
      sessionId: `test-urgent-${Date.now()}`,
      bypassCache: true
    })
  });
  
  const result = await response.json();
  
  console.log('📋 Resultado:');
  console.log(`- Tem tabela: ${result.response?.includes('|')}`);
  console.log(`- Tem ZOT: ${result.response?.includes('ZOT')}`);
  console.log(`- Tem erro Beta: ${result.response?.includes('não consegui localizar')}`);
  
  if (result.response?.includes('ZOT')) {
    console.log('\n✅ SUCESSO! A query está retornando dados corretos.');
    console.log('\n📊 Preview da resposta:');
    console.log(result.response.substring(0, 500) + '...');
  } else {
    console.log('\n❌ PROBLEMA: A query ainda não está retornando dados.');
    console.log('\n📋 Resposta completa:');
    console.log(result.response);
  }
}

clearCavalhadaCache().catch(console.error);