import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQAValidation() {
  console.log('🧪 Executando Teste de Validação QA\n');
  console.log('=' .repeat(50));

  // 1. Buscar casos de teste
  const { data: testCases, error: fetchError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .in('category', ['zone_query', 'construction_rules', 'conceptual'])
    .limit(10);

  if (fetchError) {
    console.error('❌ Erro ao buscar casos de teste:', fetchError);
    return;
  }

  console.log(`📊 Testando ${testCases.length} casos\n`);

  // 2. Criar run de validação
  const runId = crypto.randomUUID();
  const { error: runError } = await supabase
    .from('qa_validation_runs')
    .insert({
      id: runId,
      model: 'openai/gpt-3.5-turbo',
      total_tests: testCases.length,
      passed_tests: 0,
      overall_accuracy: 0,
      avg_response_time_ms: 0,
      status: 'running',
      started_at: new Date().toISOString()
    });

  if (runError) {
    console.error('❌ Erro ao criar run:', runError);
    return;
  }

  console.log(`✅ Run criada: ${runId}\n`);

  // 3. Processar cada caso de teste
  const results = [];
  let passedCount = 0;
  let totalAccuracy = 0;
  let totalTime = 0;

  for (const testCase of testCases) {
    console.log(`\n🔍 Testando: "${testCase.question}"`);
    console.log(`   Categoria: ${testCase.category}`);
    console.log(`   Dificuldade: ${testCase.difficulty}`);
    
    const startTime = Date.now();
    
    try {
      // Chamar o sistema RAG
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          query: testCase.question,
          model: 'openai/gpt-3.5-turbo',
          conversationId: `qa-test-${runId}`
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ Erro: ${errorText}`);
        
        // Salvar resultado com erro
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.uuid || testCase.id,
            validation_run_id: runId,
            model: 'openai/gpt-3.5-turbo',
            actual_answer: '',
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: responseTime,
            error_type: 'API_ERROR',
            error_details: errorText
          });
        
        continue;
      }

      const result = await response.json();
      const actualAnswer = result.response || '';
      
      // Calcular acurácia simples (comparação de palavras-chave)
      const expectedWords = (testCase.expected_answer || '').toLowerCase().split(' ');
      const actualWords = actualAnswer.toLowerCase().split(' ');
      const matchingWords = expectedWords.filter(word => 
        word.length > 3 && actualWords.includes(word)
      );
      const accuracy = matchingWords.length / Math.max(expectedWords.length, 1);
      const isCorrect = accuracy > 0.5;
      
      if (isCorrect) passedCount++;
      totalAccuracy += accuracy;
      totalTime += responseTime;

      console.log(`   ✅ Resposta recebida (${responseTime}ms)`);
      console.log(`   📊 Acurácia: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`   ✅ Correto: ${isCorrect ? 'Sim' : 'Não'}`);

      // Salvar resultado
      const { error: saveError } = await supabase
        .from('qa_validation_results')
        .insert({
          test_case_id: testCase.uuid || testCase.id,
          validation_run_id: runId,
          model: 'openai/gpt-3.5-turbo',
          actual_answer: actualAnswer.substring(0, 1000), // Limitar tamanho
          is_correct: isCorrect,
          accuracy_score: accuracy,
          response_time_ms: responseTime,
          sql_executed: result.debug?.sqlQueries?.length > 0,
          generated_sql: result.debug?.sqlQueries?.[0]?.query
        });

      if (saveError) {
        console.error('   ⚠️ Erro ao salvar resultado:', saveError.message);
      }

      results.push({
        question: testCase.question,
        isCorrect,
        accuracy,
        responseTime
      });

    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }

  // 4. Atualizar run com estatísticas finais
  const avgAccuracy = totalAccuracy / testCases.length;
  const avgTime = totalTime / testCases.length;

  const { error: updateError } = await supabase
    .from('qa_validation_runs')
    .update({
      passed_tests: passedCount,
      overall_accuracy: avgAccuracy,
      avg_response_time_ms: Math.round(avgTime),
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', runId);

  if (updateError) {
    console.error('❌ Erro ao atualizar run:', updateError);
  }

  // 5. Mostrar resumo
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO DA VALIDAÇÃO');
  console.log('=' .repeat(50));
  console.log(`✅ Casos testados: ${testCases.length}`);
  console.log(`✅ Casos corretos: ${passedCount} (${(passedCount/testCases.length*100).toFixed(1)}%)`);
  console.log(`📊 Acurácia média: ${(avgAccuracy * 100).toFixed(1)}%`);
  console.log(`⏱️ Tempo médio: ${Math.round(avgTime)}ms`);
  console.log(`\n🔗 Run ID: ${runId}`);
  console.log('💡 Acesse o Dashboard QA para ver os detalhes');
  
  console.log('\n✅ Validação concluída!');
}

// Executar
runQAValidation().catch(console.error);