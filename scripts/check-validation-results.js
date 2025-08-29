import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkValidationResults() {
  console.log('🔍 Verificando resultados de validação\n');
  console.log('=' .repeat(50));

  // Verificar últimas execuções
  const { data: runs, error: runsError } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('❌ Erro ao buscar runs:', runsError);
    return;
  }

  console.log(`📊 Últimas ${runs.length} execuções:\n`);
  
  for (const run of runs) {
    console.log(`ID: ${run.id}`);
    console.log(`   Modelo: ${run.model}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Total testes: ${run.total_tests}`);
    console.log(`   Testes passados: ${run.passed_tests}`);
    console.log(`   Acurácia: ${(run.overall_accuracy * 100).toFixed(1)}%`);
    console.log(`   Iniciado: ${new Date(run.started_at).toLocaleString('pt-BR')}`);
    
    // Contar resultados salvos para esta execução
    const { count, error: countError } = await supabase
      .from('qa_validation_results')
      .select('*', { count: 'exact', head: true })
      .eq('validation_run_id', run.id);
    
    console.log(`   Resultados salvos: ${count || 0}`);
    
    // Verificar se há discrepância
    if (count !== run.total_tests && run.status === 'completed') {
      console.log(`   ⚠️ ATENÇÃO: Discrepância! Esperado ${run.total_tests}, encontrado ${count}`);
    }
    
    // Buscar alguns resultados de exemplo
    if (count > 0) {
      const { data: results } = await supabase
        .from('qa_validation_results')
        .select('*, qa_test_cases!test_case_id(*)')
        .eq('validation_run_id', run.id)
        .limit(3);
      
      if (results && results.length > 0) {
        console.log('   Exemplos de resultados:');
        results.forEach((result, i) => {
          console.log(`      ${i+1}. ${result.qa_test_cases?.query || 'N/A'}`);
          console.log(`         Correto: ${result.is_correct ? '✅' : '❌'}`);
          console.log(`         Acurácia: ${(result.accuracy_score * 100).toFixed(1)}%`);
        });
      }
    }
    
    console.log();
  }

  // Verificar estrutura das tabelas
  console.log('📋 Estrutura da tabela qa_validation_results:');
  const { data: sample } = await supabase
    .from('qa_validation_results')
    .select('*')
    .limit(1);
  
  if (sample && sample.length > 0) {
    Object.keys(sample[0]).forEach(key => {
      console.log(`   - ${key}`);
    });
  }

  console.log('\n✅ Verificação concluída!');
}

checkValidationResults().catch(console.error);