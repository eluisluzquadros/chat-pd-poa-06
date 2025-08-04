import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanAndReimport() {
  console.log('🧹 Limpando casos de teste antigos do PDPOA...\n');
  
  // Deletar apenas os casos importados do PDPOA (preservar os 5 originais)
  const { error: deleteError } = await supabase
    .from('qa_test_cases')
    .delete()
    .like('test_id', 'pdpoa_qa_%');

  if (deleteError) {
    console.error('❌ Erro ao deletar:', deleteError.message);
    return;
  }

  console.log('✅ Casos antigos removidos\n');
  
  // Verificar quantos casos restaram
  const { count } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
    
  console.log(`📊 Casos preservados: ${count}\n`);
  
  // Reimportar do arquivo atualizado
  console.log('📥 Reimportando do arquivo atualizado...\n');
  
  try {
    execSync('python scripts/import-qa-from-docx.py', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Erro na reimportação:', error.message);
  }
  
  // Verificar total final
  const { count: finalCount } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\n✅ Total final de casos de teste: ${finalCount}`);
}

cleanAndReimport().catch(console.error);