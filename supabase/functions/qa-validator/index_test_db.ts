import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { model = 'agentic-rag' } = await req.json();
    
    // Create validation run
    const { data: validationRun, error: runError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model,
        status: 'running',
        total_tests: 0,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !validationRun) {
      console.error('Run error:', runError);
      throw new Error('Failed to create validation run');
    }

    // Get test cases - just a few for testing
    const { data: testCases, error: testError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .limit(3);

    if (testError || !testCases) {
      console.error('Test error:', testError);
      throw new Error('Failed to fetch test cases');
    }

    const totalTests = testCases.length;
    console.log(`Found ${totalTests} test cases to process`);
    
    // Update total tests count immediately
    await supabase
      .from('qa_validation_runs')
      .update({ total_tests: totalTests })
      .eq('id', validationRun.id);

    // Process tests with simple mock data
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;

    for (const testCase of testCases) {
      const startTestTime = Date.now();
      
      // Simple mock response
      const isCorrect = Math.random() > 0.3;
      const accuracy = isCorrect ? 1 : 0.6;
      const responseTime = 100 + Math.random() * 200;
      
      const result = {
        test_case_id: testCase.id,
        validation_run_id: validationRun.id,
        model,
        actual_answer: `Mock answer for: ${testCase.question}`,
        is_correct: isCorrect,
        accuracy_score: accuracy,
        response_time_ms: Math.round(responseTime),
        error_type: null,
        error_details: null,
        generated_sql: testCase.is_sql_related ? 'SELECT * FROM mock_table' : null
      };

      console.log('Inserting result:', JSON.stringify(result, null, 2));
      
      // Insert individual result
      const { error: insertError } = await supabase
        .from('qa_validation_results')
        .insert(result);

      if (insertError) {
        console.error('Error inserting result:', insertError);
        console.error('Result that failed:', JSON.stringify(result, null, 2));
        throw insertError;
      }

      if (isCorrect) passedTests++;
      totalAccuracy += accuracy;
      totalResponseTime += responseTime;
    }

    // Mark as completed
    const finalUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      passed_tests: passedTests,
      overall_accuracy: totalTests > 0 ? totalAccuracy / totalTests : 0,
      avg_response_time_ms: Math.round(totalResponseTime / totalTests),
    };
    
    console.log('Final update:', JSON.stringify(finalUpdate, null, 2));
    
    await supabase
      .from('qa_validation_runs')
      .update(finalUpdate)
      .eq('id', validationRun.id);

    const executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      validationRunId: validationRun.id,
      totalTests,
      passedTests,
      overallAccuracy: finalUpdate.overall_accuracy,
      avgResponseTime: finalUpdate.avg_response_time_ms,
      executionTime,
      message: `Test validation completed in ${executionTime}ms`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});