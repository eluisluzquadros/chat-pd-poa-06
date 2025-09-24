import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQAValidation() {
  console.log('🧪 Teste Direto de Validação QA\n');
  console.log('=' .repeat(50));

  // 1. Buscar alguns casos de teste
  const { data: testCases, error: fetchError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .limit(5);

  if (fetchError) {
    console.error('❌ Erro ao buscar casos de teste:', fetchError);
    return;
  }

  console.log(`📊 Encontrados ${testCases.length} casos de teste\n`);

  // 2. Criar uma run de validação
  const runId = crypto.randomUUID();
  const { error: runError } = await supabase
    .from('qa_validation_runs')
    .insert({
      id: runId,
      model: 'openai/gpt-3.5-turbo',
      started_at: new Date().toISOString(),
      test_count: testCases.length,
      status: 'running'
    });

  if (runError) {
    console.error('❌ Erro ao criar run:', runError);
    return;
  }

  console.log(`✅ Run de validação criada: ${runId}\n`);

  // 3. Testar cada caso
  let successCount = 0;
  let errorCount = 0;

  for (const testCase of testCases) {
    console.log(`\n🔍 Testando: "${testCase.question}"`);
    
    try {
      // Chamar qa-validator diretamente
      const response = await fetch(`${supabaseUrl}/functions/v1/qa-validator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          testCaseIds: [testCase.id],
          validationRunId: runId,
          model: 'openai/gpt-3.5-turbo'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro na validação: ${errorText}`);
        errorCount++;
        continue;
      }

      const result = await response.json();
      console.log(`✅ Validação concluída`);
      
      if (result.results && result.results[0]) {
        const res = result.results[0];
        console.log(`   - Correto: ${res.is_correct ? 'Sim' : 'Não'}`);
        console.log(`   - Acurácia: ${(res.accuracy_score * 100).toFixed(1)}%`);
        console.log(`   - Tempo: ${res.response_time_ms}ms`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
      errorCount++;
    }
  }

  // 4. Atualizar status da run
  const { error: updateError } = await supabase
    .from('qa_validation_runs')
    .update({
      completed_at: new Date().toISOString(),
      success_count: successCount,
      error_count: errorCount,
      status: 'completed'
    })
    .eq('id', runId);

  if (updateError) {
    console.error('❌ Erro ao atualizar run:', updateError);
  }

  // 5. Verificar resultados salvos
  console.log('\n\n📊 Verificando resultados salvos:');
  const { data: savedResults, error: resultsError } = await supabase
    .from('qa_validation_results')
    .select('*')
    .eq('validation_run_id', runId);

  if (!resultsError && savedResults) {
    console.log(`✅ ${savedResults.length} resultados salvos no banco`);
    
    // Calcular estatísticas
    const correct = savedResults.filter(r => r.is_correct).length;
    const avgAccuracy = savedResults.reduce((sum, r) => sum + r.accuracy_score, 0) / savedResults.length;
    const avgTime = savedResults.reduce((sum, r) => sum + r.response_time_ms, 0) / savedResults.length;
    
    console.log(`\n📈 Estatísticas:`);
    console.log(`   - Taxa de acerto: ${(correct / savedResults.length * 100).toFixed(1)}%`);
    console.log(`   - Acurácia média: ${(avgAccuracy * 100).toFixed(1)}%`);
    console.log(`   - Tempo médio: ${avgTime.toFixed(0)}ms`);
  }

  console.log('\n✅ Teste concluído!');
}

// Executar
testQAValidation().catch(console.error);