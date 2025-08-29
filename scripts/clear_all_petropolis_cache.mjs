import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testQueries = [
  "Altura máxima da construção dos prédios em porto alegre",
  "Como poderá ser feito a flexibilizaçao de Recuo de jardim?",
  "qual a altura máxima permitida?",
  "coeficiente de aproveitamento em porto alegre"
];

console.log('🗑️  Limpando cache específico das queries problemáticas...\n');

let totalDeleted = 0;

for (const query of testQueries) {
  console.log(`\n🔍 Limpando cache para: "${query}"`);
  
  // Limpar cache exato
  const { data: exactData, error: exactError } = await supabase
    .from('chat_cache')
    .delete()
    .eq('query', query);
    
  if (exactError) {
    console.error('❌ Erro ao limpar cache exato:', exactError);
  } else {
    console.log('✅ Cache exato limpo');
  }
  
  // Limpar cache com ILIKE
  const { data: ilikeData, error: ilikeError } = await supabase
    .from('chat_cache')
    .delete()
    .ilike('query', `%${query}%`);
    
  if (ilikeError) {
    console.error('❌ Erro ao limpar cache parcial:', ilikeError);
  } else {
    console.log('✅ Cache parcial limpo');
  }
}

// Limpar qualquer resposta que mencione Petrópolis incorretamente
console.log('\n🔍 Limpando qualquer cache que mencione Petrópolis...');

const { data: petropolisData, error: petropolisError } = await supabase
  .from('chat_cache')
  .delete()
  .or('response.ilike.%petrópolis%,response.ilike.%petropolis%')
  .not('query', 'ilike', '%petrópolis%')
  .not('query', 'ilike', '%petropolis%');

if (petropolisError) {
  console.error('❌ Erro ao limpar cache de Petrópolis:', petropolisError);
} else {
  console.log('✅ Cache de respostas incorretas com Petrópolis limpo');
}

console.log('\n✅ Limpeza de cache concluída!');