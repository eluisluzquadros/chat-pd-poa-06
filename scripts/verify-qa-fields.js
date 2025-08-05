import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFields() {
  console.log('🔍 Verificando campos reais de qa_test_cases\n');

  // Buscar um registro completo
  const { data, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📊 Encontrados ${data.length} registros\n`);

  // Mostrar todos os campos disponíveis
  if (data.length > 0) {
    console.log('✅ Campos disponíveis:');
    Object.keys(data[0]).forEach(key => {
      const value = data[0][key];
      console.log(`   - ${key}: ${typeof value} (exemplo: ${JSON.stringify(value).substring(0, 50)}...)`);
    });

    console.log('\n📝 Exemplos completos:\n');
    data.forEach((record, idx) => {
      console.log(`Registro ${idx + 1}:`);
      console.log(`   ID: ${record.id}`);
      console.log(`   Pergunta: ${record.query || record.question || record.prompt || 'CAMPO NÃO ENCONTRADO'}`);
      console.log(`   Categoria: ${record.category}`);
      console.log(`   UUID: ${record.uuid}`);
      console.log('   ---');
    });
  }

  // Tentar encontrar o campo correto para pergunta
  console.log('\n🔍 Procurando campo de pergunta...');
  const possibleFields = ['question', 'query', 'prompt', 'pergunta', 'test_question'];
  
  for (const field of possibleFields) {
    const { data: test, error: testError } = await supabase
      .from('qa_test_cases')
      .select(field)
      .limit(1);
    
    if (!testError && test && test.length > 0 && test[0][field]) {
      console.log(`✅ Campo encontrado: "${field}" contém: "${test[0][field]}"`);
    }
  }
}

// Executar
verifyFields().catch(console.error);