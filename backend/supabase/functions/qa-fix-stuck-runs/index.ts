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

    // Find stuck runs (status = 'running' and started more than 5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckRuns, error: fetchError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', fiveMinutesAgo);

    if (fetchError) {
      throw new Error(`Error fetching stuck runs: ${fetchError.message}`);
    }

    const fixed = [];
    if (stuckRuns && stuckRuns.length > 0) {
      for (const run of stuckRuns) {
        // Update stuck runs to completed status
        const { error: updateError } = await supabase
          .from('qa_validation_runs')
          .update({
            status: 'completed',
            completed_at: run.completed_at || new Date().toISOString(),
            error_message: 'Run was stuck and automatically marked as completed'
          })
          .eq('id', run.id);

        if (!updateError) {
          fixed.push(run.id);
        }
      }
    }

    // Also check for any runs without completed_at but with status completed
    const { data: incompleteRuns, error: incompleteError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .eq('status', 'completed')
      .is('completed_at', null);

    const fixedIncomplete = [];
    if (incompleteRuns && incompleteRuns.length > 0) {
      for (const run of incompleteRuns) {
        const { error: updateError } = await supabase
          .from('qa_validation_runs')
          .update({
            completed_at: new Date().toISOString()
          })
          .eq('id', run.id);

        if (!updateError) {
          fixedIncomplete.push(run.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stuckRuns: stuckRuns?.length || 0,
        fixedRuns: fixed,
        incompleteRuns: incompleteRuns?.length || 0,
        fixedIncompleteRuns: fixedIncomplete,
        message: `Fixed ${fixed.length} stuck runs and ${fixedIncomplete.length} incomplete runs`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});