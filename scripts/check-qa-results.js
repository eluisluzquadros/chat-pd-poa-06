import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Try multiple env var names
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://kzgtvptngyuxrhmqihvn.supabase.co';

const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.VITE_SUPABASE_ANON_KEY ||
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Z3R2cHRuZ3l1eHJobXFpaHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMjc4MDcsImV4cCI6MjA0OTYwMzgwN30.PmRvBdpmuV5dhoNJudBgT9PG0F2OJ4U2wP3xtF-bXMk';

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQAResults() {
  console.log('🔍 Verificando resultados de QA no banco...\n');

  // Verificar validation runs
  console.log('📊 Últimas execuções de validação:');
  const { data: runs, error: runsError } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('Erro ao buscar runs:', runsError);
  } else {
    console.log(`Encontradas ${runs?.length || 0} execuções`);
    runs?.forEach(run => {
      console.log(`
ID: ${run.id}
Modelo: ${run.model}
Status: ${run.status}
Total de testes: ${run.total_tests}
Testes aprovados: ${run.passed_tests}
Acurácia: ${(run.overall_accuracy * 100).toFixed(1)}%
Tempo médio: ${run.avg_response_time_ms}ms
Iniciado em: ${run.started_at}
Finalizado em: ${run.completed_at || 'Em andamento'}
      `);
    });
  }

  // Verificar últimos resultados detalhados
  console.log('\n📝 Últimos resultados de testes:');
  const { data: results, error: resultsError } = await supabase
    .from('qa_validation_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (resultsError) {
    console.error('Erro ao buscar resultados:', resultsError);
  } else {
    console.log(`Encontrados ${results?.length || 0} resultados`);
    
    // Agrupar por validation_run_id
    const groupedResults = {};
    results?.forEach(result => {
      const runId = result.validation_run_id;
      if (!groupedResults[runId]) {
        groupedResults[runId] = [];
      }
      groupedResults[runId].push(result);
    });

    Object.entries(groupedResults).forEach(([runId, runResults]) => {
      console.log(`\nRun ID: ${runId}`);
      console.log(`  - ${runResults.length} resultados salvos`);
      console.log(`  - Corretos: ${runResults.filter(r => r.is_correct).length}`);
      console.log(`  - Incorretos: ${runResults.filter(r => !r.is_correct).length}`);
      console.log(`  - Modelos: ${[...new Set(runResults.map(r => r.model))].join(', ')}`);
    });
  }

  // Verificar test cases ativos
  console.log('\n🧪 Casos de teste disponíveis:');
  const { data: testCases, error: testCasesError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true);

  if (testCasesError) {
    console.error('Erro ao buscar test cases:', testCasesError);
  } else {
    console.log(`Total de casos de teste ativos: ${testCases?.length || 0}`);
    
    // Agrupar por categoria
    const categories = {};
    testCases?.forEach(tc => {
      const cat = tc.category || 'Sem categoria';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    console.log('Por categoria:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });
  }

  // Verificar última execução com problemas
  console.log('\n⚠️ Verificando possíveis problemas:');
  
  // Runs sem resultados
  const { data: emptyRuns } = await supabase
    .from('qa_validation_runs')
    .select('id, model, total_tests, started_at')
    .eq('passed_tests', 0)
    .eq('overall_accuracy', 0)
    .order('started_at', { ascending: false })
    .limit(3);

  if (emptyRuns?.length > 0) {
    console.log('Runs com 0% de acurácia:');
    emptyRuns.forEach(run => {
      console.log(`  - ID: ${run.id}, Modelo: ${run.model}, Total: ${run.total_tests}, Data: ${run.started_at}`);
    });
  }

  // Verificar se há resultados órfãos
  const validRunIds = runs?.map(r => r.id) || [];
  const orphanResults = results?.filter(r => !validRunIds.includes(r.validation_run_id));
  if (orphanResults?.length > 0) {
    console.log(`\n❌ ${orphanResults.length} resultados órfãos (sem run correspondente)`);
  }

  console.log('\n✅ Verificação concluída!');
}

checkQAResults().catch(console.error);