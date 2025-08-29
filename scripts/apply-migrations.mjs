import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuração do Supabase
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

// Lista de migrations a aplicar
const migrations = [
  '20250205_fix_qa_test_cases_permissions.sql',
  '20250205_fix_chat_permissions.sql', 
  '20250205_fix_qa_benchmarks_permissions.sql'
];

async function applyMigrations() {
  console.log('🚀 Iniciando aplicação de migrations...\n');

  for (const migration of migrations) {
    console.log(`📄 Aplicando migration: ${migration}`);
    
    try {
      // Ler o arquivo SQL
      const sqlPath = join('supabase', 'migrations', migration);
      const sql = readFileSync(sqlPath, 'utf8');
      
      // Como não podemos executar SQL direto pelo client, vamos mostrar o SQL
      console.log('\n❗ ATENÇÃO: As migrations devem ser aplicadas manualmente via Dashboard SQL Editor');
      console.log('📋 Copie e cole o seguinte SQL no editor:\n');
      console.log('-- ' + migration);
      console.log('-- ' + '='.repeat(50));
      console.log(sql.substring(0, 500) + '...\n'); // Mostra só o início
      
    } catch (error) {
      console.error(`❌ Erro ao ler migration ${migration}:`, error.message);
    }
  }

  console.log('\n📝 INSTRUÇÕES:');
  console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
  console.log('2. Copie o conteúdo de cada arquivo de migration');
  console.log('3. Execute cada migration separadamente no SQL Editor');
  console.log('4. Verifique se não há erros após cada execução\n');

  // Vamos pelo menos verificar o estado atual das tabelas
  console.log('🔍 Verificando estado atual das tabelas...\n');

  try {
    // Verificar qa_test_cases
    const { data: testCases, error: testError } = await supabase
      .from('qa_test_cases')
      .select('id')
      .limit(1);
    
    console.log('✅ qa_test_cases:', testError ? `Erro: ${testError.message}` : 'Acessível');

    // Verificar chat_sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .limit(1);
    
    console.log('✅ chat_sessions:', sessionError ? `Erro: ${sessionError.message}` : 'Acessível');

    // Verificar qa_benchmarks
    const { data: benchmarks, error: benchError } = await supabase
      .from('qa_benchmarks')
      .select('id')
      .limit(1);
    
    console.log('✅ qa_benchmarks:', benchError ? `Erro: ${benchError.message}` : 'Acessível');

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
  }
}

// Executar
applyMigrations();