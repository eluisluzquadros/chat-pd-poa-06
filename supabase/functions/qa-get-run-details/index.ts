import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { runId } = await req.json();

    if (!runId) {
      throw new Error('runId is required');
    }

    // Fetch the run details
    const { data: run, error: runError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      throw new Error(`Run not found: ${runId}`);
    }

    // Fetch all validation results for this run
    const { data: results, error: resultsError } = await supabase
      .from('qa_validation_results')
      .select('*')
      .eq('validation_run_id', runId)
      .order('created_at', { ascending: true });
    
    if (resultsError) {
      console.error('Error fetching results:', resultsError);
      throw new Error(`Error fetching results: ${resultsError.message}`);
    }
    
    // Fetch test cases separately if we have results
    let testCasesMap = new Map();
    if (results && results.length > 0) {
      const testCaseIds = [...new Set(results.map(r => r.test_case_id))];
      const { data: testCases, error: testCasesError } = await supabase
        .from('qa_test_cases')
        .select('*')
        .in('id', testCaseIds);
      
      if (!testCasesError && testCases) {
        testCases.forEach(tc => {
          testCasesMap.set(tc.id, tc);
        });
      }
    }

    // Transform results to match ExecutionResult format
    const transformedResults = (results || []).map(result => {
      const testCase = testCasesMap.get(result.test_case_id);
      return {
        testCaseId: result.test_case_id,
        testCaseTestId: testCase?.test_id || result.test_case_id,
        question: testCase?.question || testCase?.query || '',
        expectedAnswer: testCase?.expected_answer || '',
        actualAnswer: result.actual_answer || '',
        success: result.is_correct || false,
        accuracy: result.accuracy_score || 0,
        responseTime: result.response_time_ms || 0,
        error: result.error_details || undefined,
        model: result.model
      };
    });

    // Build the complete ExecutionResult
    const executionResult = {
      runId: run.id,
      model: run.model,
      totalTests: run.total_tests,
      passedTests: run.passed_tests,
      overallAccuracy: run.overall_accuracy,
      avgResponseTime: run.avg_response_time_ms,
      status: run.status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      results: transformedResults
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: executionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-get-run-details:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});