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

    // Tentar desabilitar RLS usando service role key
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          relname as table_name,
          relrowsecurity as rls_enabled,
          relforcerowsecurity as force_rls
        FROM pg_class
        WHERE relname IN ('qa_validation_runs', 'qa_validation_results')
      `
    }).single();

    // Criar uma run de teste para verificar se funciona
    const testRunId = crypto.randomUUID();
    const testRun = {
      id: testRunId,
      model: 'test-fix-rls',
      total_tests: 1,
      passed_tests: 0,
      overall_accuracy: 0,
      avg_response_time_ms: 100,
      status: 'test',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    // Tentar inserir com service role key (bypass RLS)
    const { data: insertData, error: insertError } = await supabase
      .from('qa_validation_runs')
      .insert(testRun)
      .select()
      .single();

    // Verificar se foi inserido
    const { data: checkData, error: checkError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .eq('id', testRunId)
      .single();

    // Verificar com anon key também
    const supabaseAnon = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    );

    const { data: anonCheck, error: anonError } = await supabaseAnon
      .from('qa_validation_runs')
      .select('*')
      .eq('id', testRunId)
      .single();

    // Limpar teste se inserido
    if (checkData) {
      await supabase
        .from('qa_validation_runs')
        .delete()
        .eq('id', testRunId);
    }

    // Verificar últimas 5 runs
    const { data: recentRuns, error: recentError } = await supabase
      .from('qa_validation_runs')
      .select('id, model, status, started_at')
      .order('started_at', { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        success: true,
        rls_status: rlsCheck || 'Could not check RLS status',
        insert: {
          success: !insertError,
          error: insertError?.message,
          data: insertData
        },
        service_role_check: {
          success: !checkError,
          error: checkError?.message,
          found: !!checkData
        },
        anon_check: {
          success: !anonError,
          error: anonError?.message,
          found: !!anonCheck
        },
        recent_runs: recentRuns || [],
        recent_runs_error: recentError?.message,
        message: !insertError && checkData ? 
          'Service role key funciona corretamente' : 
          'Problema ao inserir com service role key'
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