import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTestCasesFields() {
  console.log('🔧 Corrigindo campos de qa_test_cases\n');

  try {
    // 1. Verificar se existe campo 'question' e criar campo 'query' se não existir
    console.log('📊 Verificando estrutura atual...');
    
    const { data: sampleData, error: sampleError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Erro ao verificar estrutura:', sampleError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      const fields = Object.keys(sampleData[0]);
      console.log('✅ Campos atuais:', fields);
      
      // Verificar se tem 'question' mas não 'query'
      if (fields.includes('question') && !fields.includes('query')) {
        console.log('\n⚠️ Campo "question" encontrado mas "query" não existe');
        console.log('📝 Renomeando "question" para "query"...');
        
        const { error: renameError } = await supabase.rpc('execute_sql_query', {
          query_text: 'ALTER TABLE qa_test_cases RENAME COLUMN question TO query;'
        });
        
        if (renameError) {
          console.log('⚠️ Erro ao renomear (pode já existir):', renameError.message);
        } else {
          console.log('✅ Campo renomeado com sucesso');
        }
      }
      
      // Verificar se tem 'expected_answer' mas não 'expected_keywords'
      if (fields.includes('expected_answer') && !fields.includes('expected_keywords')) {
        console.log('\n📝 Adicionando campo expected_keywords...');
        
        const { error: addError } = await supabase.rpc('execute_sql_query', {
          query_text: `
            ALTER TABLE qa_test_cases 
            ADD COLUMN IF NOT EXISTS expected_keywords TEXT[] DEFAULT '{}';
          `
        });
        
        if (addError) {
          console.log('⚠️ Erro ao adicionar campo:', addError.message);
        } else {
          console.log('✅ Campo expected_keywords adicionado');
        }
      }
      
      // Adicionar campo complexity se não existir
      if (!fields.includes('complexity')) {
        console.log('\n📝 Adicionando campo complexity...');
        
        const { error: complexityError } = await supabase.rpc('execute_sql_query', {
          query_text: `
            ALTER TABLE qa_test_cases 
            ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'medium';
          `
        });
        
        if (complexityError) {
          console.log('⚠️ Erro ao adicionar campo:', complexityError.message);
        } else {
          console.log('✅ Campo complexity adicionado');
        }
      }
      
      // Adicionar campo test_id se não existir
      if (!fields.includes('test_id')) {
        console.log('\n📝 Adicionando campo test_id...');
        
        const { error: testIdError } = await supabase.rpc('execute_sql_query', {
          query_text: `
            ALTER TABLE qa_test_cases 
            ADD COLUMN IF NOT EXISTS test_id VARCHAR(100);
          `
        });
        
        if (testIdError) {
          console.log('⚠️ Erro ao adicionar campo:', testIdError.message);
        } else {
          console.log('✅ Campo test_id adicionado');
          
          // Gerar test_ids para registros existentes
          console.log('📝 Gerando test_ids para registros existentes...');
          
          const { data: allCases } = await supabase
            .from('qa_test_cases')
            .select('id, category, query')
            .is('test_id', null);
          
          if (allCases) {
            for (const testCase of allCases) {
              const testId = `${testCase.category || 'general'}_${testCase.id}`;
              await supabase
                .from('qa_test_cases')
                .update({ test_id: testId })
                .eq('id', testCase.id);
            }
            console.log(`✅ ${allCases.length} test_ids gerados`);
          }
        }
      }
      
      // Adicionar campo min_response_length se não existir
      if (!fields.includes('min_response_length')) {
        console.log('\n📝 Adicionando campo min_response_length...');
        
        const { error: minLengthError } = await supabase.rpc('execute_sql_query', {
          query_text: `
            ALTER TABLE qa_test_cases 
            ADD COLUMN IF NOT EXISTS min_response_length INTEGER DEFAULT 50;
          `
        });
        
        if (minLengthError) {
          console.log('⚠️ Erro ao adicionar campo:', minLengthError.message);
        } else {
          console.log('✅ Campo min_response_length adicionado');
        }
      }
    }

    // 2. Verificar estrutura final
    console.log('\n📊 Verificando estrutura final...');
    const { data: finalSample } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(1);
    
    if (finalSample && finalSample.length > 0) {
      console.log('\n✅ Estrutura final da tabela:');
      Object.keys(finalSample[0]).forEach(field => {
        const value = finalSample[0][field];
        console.log(`   - ${field}: ${typeof value}`);
      });
    }

    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
fixTestCasesFields().catch(console.error);