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

    console.log('[QA-FIX-SIMPLE] Starting simple cleanup of stuck validation runs...');

    // Find and fix runs stuck in 'running' status for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckRuns, error: fetchError } = await supabase
      .from('qa_validation_runs')
      .select('id, model, started_at, total_tests')
      .eq('status', 'running')
      .lt('started_at', fiveMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stuck runs: ${fetchError.message}`);
    }

    console.log(`[QA-FIX-SIMPLE] Found ${stuckRuns?.length || 0} stuck runs`);

    let fixedCount = 0;
    const fixedIds = [];

    if (stuckRuns && stuckRuns.length > 0) {
      for (const run of stuckRuns) {
        const { error: updateError } = await supabase
          .from('qa_validation_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: 'Run was stuck and automatically cleaned up after 5 minutes'
          })
          .eq('id', run.id);

        if (!updateError) {
          fixedCount++;
          fixedIds.push(run.id);
          console.log(`[QA-FIX-SIMPLE] Fixed stuck run: ${run.id} (${run.model})`);
        } else {
          console.error(`[QA-FIX-SIMPLE] Failed to fix run ${run.id}:`, updateError);
        }
      }
    }

    // Also fix any completed runs without completed_at timestamp
    const { data: incompleteRuns, error: incompleteError } = await supabase
      .from('qa_validation_runs')
      .select('id')
      .eq('status', 'completed')
      .is('completed_at', null);

    let fixedIncompleteCount = 0;
    if (incompleteRuns && incompleteRuns.length > 0) {
      const { error: updateIncompleteError } = await supabase
        .from('qa_validation_runs')
        .update({ completed_at: new Date().toISOString() })
        .in('id', incompleteRuns.map(r => r.id));

      if (!updateIncompleteError) {
        fixedIncompleteCount = incompleteRuns.length;
      }
    }

    console.log(`[QA-FIX-SIMPLE] Cleanup completed. Fixed ${fixedCount} stuck runs and ${fixedIncompleteCount} incomplete runs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${fixedCount} stuck runs and ${fixedIncompleteCount} incomplete runs`,
        stuckRunsFound: stuckRuns?.length || 0,
        stuckRunsFixed: fixedCount,
        incompleteRunsFixed: fixedIncompleteCount,
        fixedRunIds: fixedIds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[QA-FIX-SIMPLE] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to cleanup stuck runs'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});