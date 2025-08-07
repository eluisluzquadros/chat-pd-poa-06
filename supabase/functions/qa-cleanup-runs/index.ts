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

    console.log('Starting cleanup of stuck validation runs...');

    // Find runs stuck in 'running' status for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckRuns, error: fetchError } = await supabase
      .from('qa_validation_runs')
      .select('id, model, started_at')
      .eq('status', 'running')
      .lt('started_at', thirtyMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stuck runs: ${fetchError.message}`);
    }

    if (!stuckRuns || stuckRuns.length === 0) {
      console.log('No stuck runs found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stuck runs found',
          cleaned: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`Found ${stuckRuns.length} stuck runs to clean up`);

    // Update stuck runs to 'failed' status
    const { error: updateError } = await supabase
      .from('qa_validation_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Validation run timed out after 30 minutes'
      })
      .in('id', stuckRuns.map(run => run.id));

    if (updateError) {
      console.error('Error updating stuck runs:', updateError);
      throw new Error(`Failed to update stuck runs: ${updateError.message}`);
    }

    // Also clean up any orphaned validation results
    const { error: cleanupError } = await supabase
      .from('qa_validation_results')
      .delete()
      .in('validation_run_id', stuckRuns.map(run => run.id));

    if (cleanupError) {
      console.warn('Warning: Could not clean up orphaned results:', cleanupError);
    }

    console.log(`Successfully cleaned up ${stuckRuns.length} stuck runs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${stuckRuns.length} stuck validation runs`,
        cleaned: stuckRuns.length,
        runs: stuckRuns.map(run => ({
          id: run.id,
          model: run.model,
          startedAt: run.started_at
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-cleanup-runs:', error);
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