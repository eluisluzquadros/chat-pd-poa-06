import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração otimizada
const CONFIG = {
  BATCH_SIZE: 2, // Reduzido para evitar timeout
  MODEL_TIMEOUT: 30000, // 30 segundos por teste
  COMPARISON_TIMEOUT: 10000, // 10 segundos para comparação
  MAX_TESTS_PER_RUN: 10, // Limitar para testes iniciais
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let validationRunId: string | null = null;

  try {
    const body = await req.json();
    const { model = 'agentic-rag', mode = 'all' } = body;

    console.log(`Starting QA validation with model: ${model}, mode: ${mode}`);

    // Criar run de validação
    const { data: validationRun, error: runError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model,
        status: 'running',
        started_at: new Date().toISOString(),
        total_tests: 0,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0
      })
      .select()
      .single();

    if (runError) throw runError;
    validationRunId = validationRun.id;

    // Buscar casos de teste
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .limit(CONFIG.MAX_TESTS_PER_RUN); // Limitar para evitar timeout

    const { data: testCases, error: testCasesError } = await query;
    if (testCasesError) throw testCasesError;

    console.log(`Found ${testCases.length} test cases to validate`);

    // Atualizar total de testes
    await supabase
      .from('qa_validation_runs')
      .update({ total_tests: testCases.length })
      .eq('id', validationRun.id);

    let passedTests = 0;
    const results = [];

    // Processar em batches menores
    for (let i = 0; i < testCases.length; i += CONFIG.BATCH_SIZE) {
      const batch = testCases.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1}/${Math.ceil(testCases.length/CONFIG.BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (testCase) => {
        const startTime = Date.now();
        
        try {
          // Chamar o modelo com timeout reduzido
          const modelResponse = await Promise.race([
            supabase.functions.invoke('agentic-rag', {
              body: {
                message: testCase.question,
                userRole: 'admin',
                sessionId: `qa-test-${testCase.id}`,
                skipFeedback: true
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Model timeout')), CONFIG.MODEL_TIMEOUT)
            )
          ]);

          const responseTime = Date.now() - startTime;
          
          if (modelResponse.error) {
            throw new Error(`Model error: ${modelResponse.error.message}`);
          }
          
          const actualAnswer = modelResponse.data?.response || '';

          // Rastreamento de tokens simplificado
          const inputTokens = Math.ceil(testCase.question.length / 4);
          const outputTokens = Math.ceil(actualAnswer.length / 4);
          
          await supabase.from('qa_token_usage').insert({
            validation_run_id: validationRun.id,
            test_case_id: testCase.id,
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
            estimated_cost: (inputTokens + outputTokens) * 0.000001 // Estimativa simplificada
          });

          // Comparação simplificada
          const isCorrect = actualAnswer.toLowerCase().includes(testCase.expected_answer.toLowerCase().substring(0, 50));
          const accuracy = isCorrect ? 0.8 : 0.3;

          return {
            test_case_id: testCase.id,
            model,
            actual_answer: actualAnswer.substring(0, 1000), // Limitar tamanho
            is_correct: isCorrect,
            accuracy_score: accuracy,
            response_time_ms: responseTime,
            error_type: isCorrect ? null : 'mismatch',
            error_details: isCorrect ? null : 'Answer does not match expected',
            validation_run_id: validationRun.id
          };

        } catch (error) {
          console.error(`Error testing case ${testCase.id}:`, error);
          
          return {
            test_case_id: testCase.id,
            model,
            actual_answer: '',
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: Date.now() - startTime,
            error_type: 'execution_error',
            error_details: error.message,
            validation_run_id: validationRun.id
          };
        }
      });

      // Aguardar batch
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.is_correct) passedTests++;
        }
      }
      
      // Delay entre batches
      if (i + CONFIG.BATCH_SIZE < testCases.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Inserir resultados
    const { error: resultsError } = await supabase
      .from('qa_validation_results')
      .insert(results);

    if (resultsError) throw resultsError;

    // Atualizar run
    const overallAccuracy = testCases.length > 0 ? passedTests / testCases.length : 0;
    const avgResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

    await supabase
      .from('qa_validation_runs')
      .update({
        total_tests: testCases.length,
        passed_tests: passedTests,
        overall_accuracy: overallAccuracy,
        avg_response_time_ms: Math.round(avgResponseTime),
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', validationRun.id);

    console.log(`QA validation completed: ${passedTests}/${testCases.length} passed`);

    return new Response(JSON.stringify({
      success: true,
      validationRunId: validationRun.id,
      totalTests: testCases.length,
      passedTests,
      overallAccuracy,
      avgResponseTime: Math.round(avgResponseTime)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('QA validation error:', error);
    
    if (validationRunId) {
      await supabase
        .from('qa_validation_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', validationRunId);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});