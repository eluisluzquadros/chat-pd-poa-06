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

    console.log('[QA-CLEANUP] Starting cleanup of failed and orphaned validation runs...');

    // Step 1: Find runs that are stuck in 'running' status for more than 5 minutes (more aggressive)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckRuns, error: stuckError } = await supabase
      .from('qa_validation_runs')
      .select('id, model, started_at, total_tests')
      .eq('status', 'running')
      .lt('started_at', fiveMinutesAgo);

    if (stuckError) {
      throw new Error(`Failed to fetch stuck runs: ${stuckError.message}`);
    }

    console.log(`[QA-CLEANUP] Found ${stuckRuns?.length || 0} stuck runs to clean up`);

    // Step 2: Find runs with no corresponding results
    const { data: orphanedRuns, error: orphanedError } = await supabase
      .from('qa_validation_runs')
      .select(`
        id, 
        model, 
        started_at, 
        status,
        total_tests,
        (SELECT COUNT(*) FROM qa_validation_results WHERE validation_run_id = qa_validation_runs.id) as result_count
      `)
      .neq('status', 'running'); // Only check completed/failed runs

    if (orphanedError) {
      throw new Error(`Failed to fetch orphaned runs: ${orphanedError.message}`);
    }

    const runsWithoutResults = orphanedRuns?.filter(run => 
      run.result_count === 0 && run.total_tests > 0
    ) || [];

    console.log(`[QA-CLEANUP] Found ${runsWithoutResults.length} runs without results`);

    let cleanupCount = 0;
    
    // Clean up stuck runs
    if (stuckRuns && stuckRuns.length > 0) {
      const { error: updateStuckError } = await supabase
        .from('qa_validation_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Run was stuck and automatically cleaned up after 5 minutes'
        })
        .in('id', stuckRuns.map(run => run.id));

      if (updateStuckError) {
        console.error('[QA-CLEANUP] Error updating stuck runs:', updateStuckError);
      } else {
        cleanupCount += stuckRuns.length;
        console.log(`[QA-CLEANUP] Cleaned up ${stuckRuns.length} stuck runs`);
      }
    }

    // Mark orphaned runs as failed
    if (runsWithoutResults.length > 0) {
      const { error: updateOrphanedError } = await supabase
        .from('qa_validation_runs')
        .update({
          status: 'failed',
          error_message: 'Run completed but no results were saved - potential data integrity issue'
        })
        .in('id', runsWithoutResults.map(run => run.id));

      if (updateOrphanedError) {
        console.error('[QA-CLEANUP] Error updating orphaned runs:', updateOrphanedError);
      } else {
        cleanupCount += runsWithoutResults.length;
        console.log(`[QA-CLEANUP] Marked ${runsWithoutResults.length} orphaned runs as failed`);
      }
    }

    // Step 3: Clean up any orphaned validation results (results without corresponding runs)
    const { error: orphanedResultsError } = await supabase
      .from('qa_validation_results')
      .delete()
      .not('validation_run_id', 'in', `(SELECT id FROM qa_validation_runs)`);

    if (orphanedResultsError) {
      console.warn('[QA-CLEANUP] Warning: Could not clean up orphaned results:', orphanedResultsError);
    }

    // Step 4: Get summary statistics after cleanup
    const { data: finalStats, error: statsError } = await supabase
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

    console.log(`[QA-CLEANUP] Cleanup completed. Total runs cleaned: ${cleanupCount}`);
    console.log(`[QA-CLEANUP] Final statistics:`, finalStats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        cleanedRuns: cleanupCount,
        stuckRuns: stuckRuns?.length || 0,
        orphanedRuns: runsWithoutResults.length,
        finalStats: finalStats || {},
        details: {
          stuckRunIds: stuckRuns?.map(r => r.id) || [],
          orphanedRunIds: runsWithoutResults.map(r => r.id)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[QA-CLEANUP] Error in cleanup process:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Cleanup process failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});