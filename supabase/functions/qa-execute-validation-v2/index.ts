import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  id: string;
  question?: string;
  query?: string;
  expected_answer: string;
  category: string;
  difficulty?: string;
  is_sql_related?: boolean;
}

interface ValidationOptions {
  models?: string[];
  mode: 'all' | 'filtered' | 'random';
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[qa-execute-validation-v2] Function called');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRoles || userRoles.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Parse request body
    const options: ValidationOptions = await req.json();
    console.log('[qa-execute-validation-v2] Options:', options);

    const models = options.models || ['anthropic/claude-3-5-sonnet-20241022'];
    const runIds: string[] = [];

    // Fetch test cases based on options
    let query = supabaseClient
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true);

    if (options.mode === 'filtered') {
      if (options.categories && options.categories.length > 0) {
        query = query.in('category', options.categories);
      }
      if (options.difficulties && options.difficulties.length > 0) {
        query = query.in('difficulty', options.difficulties);
      }
    }

    if (options.excludeSQL) {
      query = query.eq('is_sql_related', false);
    }

    const { data: allTestCases, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    let testCases: TestCase[] = allTestCases || [];

    // Handle random mode
    if (options.mode === 'random' && options.randomCount) {
      const count = Math.min(options.randomCount, testCases.length);
      testCases = testCases
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    }

    console.log(`[qa-execute-validation-v2] Processing ${testCases.length} test cases for ${models.length} models`);

    // Process each model
    for (const model of models) {
      // Create validation run record
      const { data: run, error: runError } = await supabaseClient
        .from('qa_validation_runs')
        .insert({
          model,
          status: 'running',
          total_tests: testCases.length,
          passed_tests: 0,
          overall_accuracy: 0,
          avg_response_time_ms: 0,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString()
        })
        .select()
        .single();

      if (runError) {
        console.error('[qa-execute-validation-v2] Error creating run:', runError);
        continue;
      }

      runIds.push(run.id);
      console.log(`[qa-execute-validation-v2] Created run ${run.id} for model ${model}`);

      // Process test cases in background
      processTestCases(run.id, model, testCases, supabaseClient).catch(err => {
        console.error(`[qa-execute-validation-v2] Error processing tests for ${model}:`, err);
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        runIds,
        message: `Started validation for ${models.length} model(s) with ${testCases.length} test cases each`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[qa-execute-validation-v2] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processTestCases(
  runId: string,
  model: string,
  testCases: TestCase[],
  supabaseClient: any
) {
  console.log(`[processTestCases] Starting for run ${runId}, model ${model}`);
  
  let passedTests = 0;
  let totalAccuracy = 0;
  let totalResponseTime = 0;

  try {
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const startTime = Date.now();

      try {
        // Update heartbeat
        await supabaseClient
          .from('qa_validation_runs')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', runId);

        // Call unified-chat to get answer
        const question = testCase.question || testCase.query || '';
        
        const { data: chatResponse, error: chatError } = await supabaseClient.functions.invoke('unified-chat', {
          body: { 
            message: question,
            sessionId: `qa-test-${runId}`,
            model
          }
        });

        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;

        let actualAnswer = '';
        let isCorrect = false;
        let accuracyScore = 0;

        if (chatError) {
          console.error(`[processTestCases] Chat error for test ${testCase.id}:`, chatError);
          actualAnswer = `Error: ${chatError.message}`;
        } else {
          actualAnswer = chatResponse?.message || '';
          
          // Simple accuracy calculation based on keyword matching
          const expectedKeywords = testCase.expected_answer.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const actualWords = actualAnswer.toLowerCase().split(/\s+/);
          const matchedKeywords = expectedKeywords.filter(kw => actualWords.some(w => w.includes(kw)));
          
          accuracyScore = expectedKeywords.length > 0 
            ? (matchedKeywords.length / expectedKeywords.length) * 100
            : 0;
          
          isCorrect = accuracyScore >= 70;
          if (isCorrect) passedTests++;
          totalAccuracy += accuracyScore;
        }

        // Save result
        await supabaseClient
          .from('qa_validation_results')
          .insert({
            validation_run_id: runId,
            test_case_id: testCase.id,
            model,
            actual_answer: actualAnswer,
            is_correct: isCorrect,
            accuracy_score: accuracyScore / 100,
            response_time_ms: responseTime,
            created_at: new Date().toISOString()
          });

        console.log(`[processTestCases] Completed test ${i + 1}/${testCases.length} for run ${runId}`);

      } catch (testError) {
        console.error(`[processTestCases] Error processing test ${testCase.id}:`, testError);
        
        // Save error result
        await supabaseClient
          .from('qa_validation_results')
          .insert({
            validation_run_id: runId,
            test_case_id: testCase.id,
            model,
            actual_answer: `Error: ${testError.message}`,
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: Date.now() - startTime,
            error_details: testError.message,
            created_at: new Date().toISOString()
          });
      }
    }

    // Update run with final results
    const avgAccuracy = testCases.length > 0 ? totalAccuracy / testCases.length / 100 : 0;
    const avgResponseTime = testCases.length > 0 ? totalResponseTime / testCases.length : 0;

    await supabaseClient
      .from('qa_validation_runs')
      .update({
        status: 'completed',
        passed_tests: passedTests,
        overall_accuracy: avgAccuracy,
        avg_response_time_ms: avgResponseTime,
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);

    console.log(`[processTestCases] Completed run ${runId}. Passed: ${passedTests}/${testCases.length}, Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);

  } catch (error) {
    console.error(`[processTestCases] Fatal error for run ${runId}:`, error);
    
    // Mark run as failed
    await supabaseClient
      .from('qa_validation_runs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);
  }
}
