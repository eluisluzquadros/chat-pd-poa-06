import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  console.log('🔍 Verificando estrutura de qa_validation_runs\n');

  // 1. Buscar um registro de exemplo
  const { data: sample, error } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erro:', error);
  } else if (sample && sample.length > 0) {
    console.log('✅ Colunas disponíveis:');
    Object.keys(sample[0]).forEach(key => {
      console.log(`   - ${key}: ${typeof sample[0][key]}`);
    });
  } else {
    console.log('⚠️ Nenhum registro encontrado');
    
    // Tentar inserir um registro de teste para ver os campos
    console.log('\n📊 Tentando inserir registro de teste...');
    const testRun = {
      id: crypto.randomUUID(),
      model: 'test',
      started_at: new Date().toISOString(),
      status: 'test'
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('qa_validation_runs')
      .insert(testRun)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
    } else if (inserted && inserted.length > 0) {
      console.log('✅ Registro inserido. Campos retornados:');
      Object.keys(inserted[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof inserted[0][key]}`);
      });
      
      // Limpar teste
      await supabase
        .from('qa_validation_runs')
        .delete()
        .eq('id', testRun.id);
    }
  }

  // 2. Verificar também qa_validation_results
  console.log('\n\n🔍 Verificando estrutura de qa_validation_results');
  const { data: resultsSample, error: resultsError } = await supabase
    .from('qa_validation_results')
    .select('*')
    .limit(1);

  if (!resultsError && resultsSample && resultsSample.length > 0) {
    console.log('✅ Colunas disponíveis:');
    Object.keys(resultsSample[0]).forEach(key => {
      console.log(`   - ${key}: ${typeof resultsSample[0][key]}`);
    });
  } else {
    console.log('⚠️ Nenhum resultado encontrado ainda');
  }
}

// Executar
checkStructure().catch(console.error);