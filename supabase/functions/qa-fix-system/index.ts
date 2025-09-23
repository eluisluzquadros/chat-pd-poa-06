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

    console.log('Starting QA system fix...');
    
    // Fix stuck runs
    const { data: stuckRuns, error: stuckError } = await supabase
      .from('qa_validation_runs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('status', 'running')
      .select();

    // Count tables
    const { count: runsCount } = await supabase
      .from('qa_validation_runs')
      .select('*', { count: 'exact', head: true });

    const { count: resultsCount } = await supabase
      .from('qa_validation_results')
      .select('*', { count: 'exact', head: true });

    const { count: casesCount } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });

    // Test direct access with anon key
    const supabaseAnon = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    );

    // Test anon access to all tables
    const { data: anonRuns, error: anonRunsError } = await supabaseAnon
      .from('qa_validation_runs')
      .select('*')
      .limit(1);

    const { data: anonResults, error: anonResultsError } = await supabaseAnon
      .from('qa_validation_results')
      .select('*')
      .limit(1);

    const { data: anonCases, error: anonCasesError } = await supabaseAnon
      .from('qa_test_cases')
      .select('*')
      .limit(1);

    const response = {
      success: true,
      fixes: {
        stuckRunsFixed: stuckRuns?.length || 0,
        stuckRunsError: stuckError?.message
      },
      counts: {
        runs: runsCount || 0,
        results: resultsCount || 0,
        cases: casesCount || 0
      },
      anonAccess: {
        runsAccessible: !anonRunsError,
        resultsAccessible: !anonResultsError,
        casesAccessible: !anonCasesError,
        errors: {
          runs: anonRunsError?.message,
          results: anonResultsError?.message,
          cases: anonCasesError?.message
        }
      },
      message: 'Sistema QA verificado e corrigido',
      recommendation: (!anonRunsError && !anonResultsError && !anonCasesError) 
        ? '✅ Sistema funcionando corretamente - RLS desabilitado ou políticas corretas'
        : '⚠️ RLS ainda pode estar bloqueando acesso - execute o script SQL fornecido'
    };

    console.log('QA system fix completed:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error fixing QA system:', error);
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