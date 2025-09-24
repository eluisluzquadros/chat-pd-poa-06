// Script para limpar queries curtas do cache
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearShortQueries() {
  console.log('🧹 Limpando queries curtas (possíveis nomes de bairros)...\n');

  // Buscar queries curtas
  const { data: allQueries, error: selectError } = await supabase
    .from('query_cache')
    .select('key, query');
  
  if (selectError) {
    console.error('Erro ao buscar queries:', selectError);
    return;
  }
  
  // Filtrar queries curtas localmente
  const shortQueries = allQueries?.filter(q => 
    q.query.length < 30 && 
    !q.query.toLowerCase().includes('quant') &&
    !q.query.toLowerCase().includes('lista') &&
    !q.query.toLowerCase().includes('todos')
  );

  console.log(`🔍 Encontradas ${shortQueries?.length || 0} queries curtas:`);
  shortQueries?.forEach(q => console.log(`  - "${q.query}" (${q.query.length} caracteres)`));

  if (shortQueries && shortQueries.length > 0) {
    // Deletar queries curtas
    const keysToDelete = shortQueries.map(q => q.key);
    
    const { error: deleteError } = await supabase
      .from('query_cache')
      .delete()
      .in('key', keysToDelete);

    if (deleteError) {
      console.error('\n❌ Erro ao deletar queries:', deleteError);
      return;
    }

    console.log(`\n✅ ${shortQueries.length} queries curtas removidas!`);
  } else {
    console.log('\n✅ Nenhuma query curta encontrada para remover.');
  }
}

clearShortQueries().catch(console.error);