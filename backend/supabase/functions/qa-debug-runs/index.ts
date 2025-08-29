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

    // Verificar as últimas runs
    const { data: runs, error: runsError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (runsError) {
      console.error('Error fetching runs:', runsError);
    }

    // Tentar inserir uma run de teste
    const testRunId = `test_run_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('qa_validation_runs')
      .insert({
        id: testRunId,
        model: 'test-model',
        total_tests: 1,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 100,
        status: 'test',
        started_at: new Date().toISOString()
      })
      .select();

    // Tentar recuperar a run inserida
    const { data: checkData, error: checkError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .eq('id', testRunId)
      .single();

    // Deletar a run de teste
    if (checkData) {
      await supabase
        .from('qa_validation_runs')
        .delete()
        .eq('id', testRunId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        existingRuns: runs?.length || 0,
        runs: runs?.slice(0, 3),
        insertTest: {
          success: !insertError,
          error: insertError?.message,
          data: insertData
        },
        checkTest: {
          success: !checkError,
          error: checkError?.message,
          data: checkData
        },
        message: insertError ? 
          'Problema ao inserir runs - possível RLS ativo' : 
          'Sistema funcionando corretamente'
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