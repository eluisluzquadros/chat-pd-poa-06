import { readFileSync } from 'fs';
import { join } from 'path';

// Lista de migrations
const migrations = [
  '20250205_fix_qa_test_cases_permissions.sql',
  '20250205_fix_chat_permissions.sql', 
  '20250205_fix_qa_benchmarks_permissions.sql'
];

console.log('📋 MIGRATIONS PARA APLICAR NO SUPABASE SQL EDITOR');
console.log('================================================\n');
console.log('📍 Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql\n');

migrations.forEach((migration, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`MIGRATION ${index + 1}: ${migration}`);
  console.log('='.repeat(80));
  
  try {
    const sqlPath = join('supabase', 'migrations', migration);
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(sql);
    console.log('\n-- FIM DA MIGRATION ' + (index + 1) + ' --\n');
  } catch (error) {
    console.error(`❌ Erro ao ler ${migration}:`, error.message);
  }
});

console.log('\n📝 INSTRUÇÕES DE APLICAÇÃO:');
console.log('1. Copie cada migration acima');
console.log('2. Cole no SQL Editor do Supabase');
console.log('3. Execute cada uma separadamente');
console.log('4. Verifique se não há erros');
console.log('5. Teste as funcionalidades após aplicar todas as migrations\n');