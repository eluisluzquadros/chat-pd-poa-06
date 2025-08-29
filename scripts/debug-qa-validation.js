import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjA2MTIsImV4cCI6MjA1MTQ5NjYxMn0.9lz0zqLRUsLei1tuF9qL45RU9Cjue-6Qs1BvKQ3VQME'
);

async function debug() {
  console.log('🔍 Debug QA Validation\n');

  // 1. Verificar estrutura dos test cases
  console.log('1️⃣ Estrutura dos Test Cases:');
  const { data: testCases } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(2);
  
  if (testCases?.length > 0) {
    console.log('Exemplo de test case:');
    console.log('Fields:', Object.keys(testCases[0]));
    console.log('ID:', testCases[0].id);
    console.log('Test_ID:', testCases[0].test_id);
  }

  // 2. Verificar última run sem resultados
  console.log('\n2️⃣ Última Run com Problema (0% accuracy):');
  const { data: problemRun } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .eq('overall_accuracy', 0)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (problemRun) {
    console.log('Run ID:', problemRun.id);
    console.log('Model:', problemRun.model);
    console.log('Total tests:', problemRun.total_tests);
    console.log('Started:', problemRun.started_at);
    
    // Verificar se há resultados para essa run
    const { data: results, count } = await supabase
      .from('qa_validation_results')
      .select('*', { count: 'exact' })
      .eq('validation_run_id', problemRun.id);
    
    console.log('Resultados salvos para essa run:', count || 0);
    
    if (results?.length > 0) {
      console.log('Exemplo de resultado:');
      console.log(results[0]);
    }
  }

  // 3. Testar inserção de resultado
  console.log('\n3️⃣ Testando Inserção de Resultado:');
  
  // Criar uma run de teste
  const { data: testRun, error: runError } = await supabase
    .from('qa_validation_runs')
    .insert({
      model: 'test-model',
      status: 'running',
      total_tests: 1,
      passed_tests: 0,
      overall_accuracy: 0,
      avg_response_time_ms: 0,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (runError) {
    console.error('Erro ao criar run de teste:', runError);
  } else {
    console.log('Run de teste criada:', testRun.id);
    
    // Tentar inserir resultado
    const testResult = {
      test_case_id: testCases[0]?.id || testCases[0]?.test_id,
      validation_run_id: testRun.id,
      model: 'test-model',
      actual_answer: 'Resposta de teste',
      is_correct: true,
      accuracy_score: 1.0,
      response_time_ms: 100,
      error_type: null,
      error_details: null
    };
    
    console.log('Tentando inserir resultado:', testResult);
    
    const { error: resultError } = await supabase
      .from('qa_validation_results')
      .insert(testResult);
    
    if (resultError) {
      console.error('❌ Erro ao inserir resultado:', resultError);
      console.log('Detalhes do erro:', JSON.stringify(resultError, null, 2));
    } else {
      console.log('✅ Resultado inserido com sucesso!');
      
      // Limpar teste
      await supabase.from('qa_validation_results').delete().eq('validation_run_id', testRun.id);
      await supabase.from('qa_validation_runs').delete().eq('id', testRun.id);
      console.log('Dados de teste limpos.');
    }
  }

  // 4. Verificar esquema da tabela
  console.log('\n4️⃣ Verificando Esquema das Tabelas:');
  
  // Buscar informações do esquema via query SQL
  const { data: schemaInfo } = await supabase.rpc('get_table_columns', {
    table_name: 'qa_validation_results'
  }).catch(() => ({ data: null }));
  
  if (schemaInfo) {
    console.log('Colunas de qa_validation_results:', schemaInfo);
  } else {
    console.log('Não foi possível obter esquema (função RPC pode não existir)');
  }

  console.log('\n✅ Debug concluído!');
}

debug().catch(console.error);