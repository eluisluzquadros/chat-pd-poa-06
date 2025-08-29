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

    const { runIds } = await req.json();

    if (!runIds || !Array.isArray(runIds)) {
      throw new Error('runIds array is required');
    }

    const results = [];

    for (const runId of runIds) {
      // Check if run exists
      const { data: run, error: fetchError } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (fetchError || !run) {
        results.push({ runId, status: 'not_found' });
        continue;
      }

      // If status is already completed, skip
      if (run.status === 'completed') {
        results.push({ runId, status: 'already_completed' });
        continue;
      }

      // Update to completed status
      const { error: updateError } = await supabase
        .from('qa_validation_runs')
        .update({
          status: 'completed',
          completed_at: run.completed_at || new Date().toISOString()
        })
        .eq('id', runId);

      if (updateError) {
        results.push({ runId, status: 'error', error: updateError.message });
      } else {
        results.push({ runId, status: 'updated' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        updated: results.filter(r => r.status === 'updated').length,
        already_completed: results.filter(r => r.status === 'already_completed').length,
        not_found: results.filter(r => r.status === 'not_found').length,
        errors: results.filter(r => r.status === 'error').length
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