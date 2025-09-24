import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUUIDCompatibility() {
  console.log('🔧 Corrigindo incompatibilidade UUID vs INTEGER\n');

  try {
    // 1. Adicionar campo UUID na tabela qa_test_cases
    console.log('📊 Adicionando campo UUID em qa_test_cases...');
    
    const { data: addColumn, error: addError } = await supabase.rpc('execute_sql_query', {
      query_text: `
        ALTER TABLE qa_test_cases 
        ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();
      `
    });

    if (addError) {
      console.log('⚠️ Erro ao adicionar coluna (pode já existir):', addError.message);
    } else {
      console.log('✅ Campo UUID adicionado/verificado');
    }

    // 2. Gerar UUIDs para registros existentes que não têm
    console.log('\n📊 Gerando UUIDs para registros existentes...');
    
    const { data: updateUUIDs, error: updateError } = await supabase.rpc('execute_sql_query', {
      query_text: `
        UPDATE qa_test_cases 
        SET uuid = gen_random_uuid() 
        WHERE uuid IS NULL;
      `
    });

    if (updateError) {
      console.log('⚠️ Erro ao gerar UUIDs:', updateError.message);
    } else {
      console.log('✅ UUIDs gerados para registros existentes');
    }

    // 3. Verificar estrutura atual
    console.log('\n📊 Verificando estrutura das tabelas:');
    
    // Verificar qa_test_cases
    const { data: testCases } = await supabase
      .from('qa_test_cases')
      .select('id, test_id, uuid')
      .limit(5);

    console.log('\n✅ Amostra de qa_test_cases:');
    testCases?.forEach(tc => {
      console.log(`   ID: ${tc.id}, test_id: ${tc.test_id}, UUID: ${tc.uuid}`);
    });

    // Verificar qa_validation_results
    console.log('\n📊 Verificando qa_validation_results:');
    const { data: validationResults } = await supabase
      .from('qa_validation_results')
      .select('id, test_case_id')
      .limit(5);

    if (validationResults && validationResults.length > 0) {
      console.log('✅ Amostra de qa_validation_results:');
      validationResults.forEach(vr => {
        console.log(`   ID: ${vr.id}, test_case_id: ${vr.test_case_id}`);
      });
    } else {
      console.log('⚠️ Nenhum resultado de validação encontrado ainda');
    }

    // 4. Criar view para facilitar joins
    console.log('\n📊 Criando view para facilitar consultas...');
    
    const { error: viewError } = await supabase.rpc('execute_sql_query', {
      query_text: `
        CREATE OR REPLACE VIEW qa_test_results_view AS
        SELECT 
          vr.*,
          tc.question,
          tc.expected_answer,
          tc.category,
          tc.difficulty,
          tc.test_id as numeric_test_id
        FROM qa_validation_results vr
        LEFT JOIN qa_test_cases tc 
          ON tc.uuid::text = vr.test_case_id::text
          OR tc.id::text = vr.test_case_id::text;
      `
    });

    if (viewError) {
      console.log('⚠️ Erro ao criar view:', viewError.message);
    } else {
      console.log('✅ View criada para facilitar consultas');
    }

    console.log('\n✅ Processo de compatibilização concluído!');
    console.log('\n📝 Recomendações:');
    console.log('   1. O sistema agora suporta tanto IDs numéricos quanto UUIDs');
    console.log('   2. Use a view qa_test_results_view para consultas join');
    console.log('   3. O qa-validator já está preparado para ambos os formatos');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
fixUUIDCompatibility().catch(console.error);