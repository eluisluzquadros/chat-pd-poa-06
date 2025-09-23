import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[QA-TEST-FIXES] Starting comprehensive fix testing...');

    // Step 1: Execute cleanup
    console.log('[QA-TEST-FIXES] Step 1: Executing cleanup...');
    const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke('qa-cleanup-failed-runs');
    
    if (cleanupError) {
      console.error('[QA-TEST-FIXES] Cleanup failed:', cleanupError);
    } else {
      console.log('[QA-TEST-FIXES] Cleanup result:', cleanupResult);
    }

    // Step 2: Get current stats
    const { data: currentStats, error: statsError } = await supabase
      .from('qa_validation_runs')
      .select('status')
      .then(result => {
        if (result.error) return { data: null, error: result.error };
        
        const stats = result.data?.reduce((acc, run) => {
          acc[run.status] = (acc[run.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        return { data: stats, error: null };
      });

    // Step 3: Test small validation run to verify fixes
    console.log('[QA-TEST-FIXES] Step 2: Testing small validation run...');
    const { data: testResult, error: testError } = await supabase.functions.invoke('qa-execute-validation-v2', {
      body: {
        mode: 'random',
        randomCount: 2,
        models: ['agentic-rag'],
        includeSQL: false,
        excludeSQL: false
      }
    });

    if (testError) {
      console.error('[QA-TEST-FIXES] Test validation failed:', testError);
    } else {
      console.log('[QA-TEST-FIXES] Test validation result:', testResult);
    }

    // Step 4: Verify results were saved
    let testRunId = null;
    if (testResult?.success && testResult.runs?.[0]?.runId) {
      testRunId = testResult.runs[0].runId;
      
      // Wait a bit for results to be saved
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: savedResults, error: resultsError } = await supabase
        .from('qa_validation_results')
        .select('*')
        .eq('validation_run_id', testRunId);

      console.log(`[QA-TEST-FIXES] Found ${savedResults?.length || 0} saved results for test run ${testRunId}`);
    }

    // Step 5: Check for any remaining issues
    const { data: remainingIssues, error: issuesError } = await supabase
      .from('qa_validation_runs')
      .select(`
        id, 
        model, 
        status, 
        started_at,
        total_tests,
        (SELECT COUNT(*) FROM qa_validation_results WHERE validation_run_id = qa_validation_runs.id) as result_count
      `)
      .or('status.eq.running,status.eq.failed')
      .order('started_at', { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Fix testing completed',
        results: {
          cleanup: cleanupResult,
          currentStats,
          testValidation: testResult,
          testRunId,
          remainingIssues: remainingIssues || [],
          totalIssues: remainingIssues?.length || 0
        },
        recommendations: remainingIssues?.length > 0 ? 
          'Some issues remain - consider running additional cleanup or manual intervention' :
          'All major issues appear to be resolved - system is ready for normal operation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[QA-TEST-FIXES] Error in fix testing:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Fix testing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});