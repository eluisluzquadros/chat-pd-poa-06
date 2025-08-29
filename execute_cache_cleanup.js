// Script para limpar cache via API do Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearCache() {
  console.log('🧹 Limpando cache de queries problemáticas...\n');

  // Primeiro, contar queries em cache
  const { count: totalBefore, error: countError } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Erro ao contar cache:', countError);
    return;
  }

  console.log(`📊 Total de queries em cache antes: ${totalBefore}`);

  // Buscar queries problemáticas
  const { data: problemQueries, error: selectError } = await supabase
    .from('query_cache')
    .select('key, query')
    .or('query.ilike.*três*figueiras*,query.ilike.*tres*figueiras*,query.ilike.*petrópolis*,query.ilike.*cristal*');

  if (selectError) {
    console.error('Erro ao buscar queries:', selectError);
    return;
  }

  console.log(`\n🔍 Encontradas ${problemQueries.length} queries problemáticas:`);
  problemQueries.forEach(q => console.log(`  - "${q.query}"`));

  // Deletar queries problemáticas
  const { error: deleteError } = await supabase
    .from('query_cache')
    .delete()
    .or('query.ilike.*três*figueiras*,query.ilike.*tres*figueiras*,query.ilike.*petrópolis*,query.ilike.*cristal*');

  if (deleteError) {
    console.error('\n❌ Erro ao deletar queries:', deleteError);
    return;
  }

  // Deletar também queries muito curtas (possíveis nomes de bairros)
  const { error: deleteShortError } = await supabase
    .from('query_cache')
    .delete()
    .lt('char_length(query)', 30)
    .not('query', 'ilike', '*quant*');

  if (deleteShortError) {
    console.error('\n❌ Erro ao deletar queries curtas:', deleteShortError);
  }

  // Contar novamente
  const { count: totalAfter, error: countError2 } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Limpeza concluída!`);
  console.log(`📊 Total de queries em cache depois: ${totalAfter}`);
  console.log(`🗑️  Queries removidas: ${totalBefore - totalAfter}`);
}

clearCache().catch(console.error);