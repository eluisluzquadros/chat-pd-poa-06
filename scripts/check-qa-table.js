import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQATable() {
  console.log('🔍 Verificando estrutura da tabela qa_test_cases\n');
  
  // Buscar um exemplo de registro
  const { data: sample, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('📋 Colunas disponíveis na tabela:');
    Object.keys(sample[0]).forEach(key => {
      const value = sample[0][key];
      const type = typeof value;
      console.log(`   - ${key} (${type})`);
    });
    
    console.log('\n📝 Exemplo de registro:');
    console.log(JSON.stringify(sample[0], null, 2));
  }

  console.log('\n✅ Verificação concluída!');
}

// Executar
checkQATable();