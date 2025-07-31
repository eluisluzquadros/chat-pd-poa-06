import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function addColumns() {
  console.log('📊 Adicionando colunas faltantes...\n');
  
  const queries = [
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS title TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false"
  ];
  
  for (const query of queries) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`❌ Erro: ${error.message}`);
      } else {
        console.log(`✅ Executado: ${query}`);
      }
    } catch (e) {
      // Se exec_sql não existir, tentar direto
      console.log(`⚠️ Não foi possível executar: ${query}`);
    }
  }
  
  console.log('\n✅ Processo concluído!');
}

addColumns().catch(console.error);