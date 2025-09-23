import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura da tabela qa_test_cases...\n');
  
  try {
    // Inserir um registro de teste para ver o erro completo
    const testRecord = {
      test_id: 'test_' + Date.now(),
      query: 'teste',
      question: 'teste',
      expected_answer: 'teste',
      category: 'geral',
      is_active: true,
      is_sql_related: false,
      tags: ['teste'],
      version: 1,
      // Adicionar campos que podem estar faltando
      expected_keywords: ['teste'],
      model_specific_responses: {},
      validation_criteria: {},
      metadata: {}
    };
    
    const { data, error } = await supabase
      .from('qa_test_cases')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.log('❌ Erro ao inserir (esperado):', error.message);
      console.log('\n📋 Detalhes do erro:', error.details);
      
      // Tentar descobrir campos obrigatórios
      if (error.details && error.details.includes('null value in column')) {
        const match = error.details.match(/null value in column "(\w+)"/);
        if (match) {
          console.log(`\n⚠️  Campo obrigatório faltando: ${match[1]}`);
        }
      }
    } else {
      console.log('✅ Registro inserido com sucesso!');
      console.log('📋 Estrutura aceita:', Object.keys(testRecord));
      
      // Deletar o registro de teste
      if (data && data[0]) {
        await supabase
          .from('qa_test_cases')
          .delete()
          .eq('id', data[0].id);
      }
    }
    
    // Tentar buscar um registro para ver a estrutura
    const { data: sample } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log('\n📊 Colunas encontradas na tabela:');
      console.log(Object.keys(sample[0]));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkTableStructure();