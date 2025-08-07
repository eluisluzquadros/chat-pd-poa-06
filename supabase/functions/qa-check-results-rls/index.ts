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

    // Test inserting a result with service role key
    const testResult = {
      validation_run_id: crypto.randomUUID(),
      test_case_id: crypto.randomUUID(),
      model: 'test-model',
      actual_answer: 'Test answer',
      is_correct: true,
      accuracy_score: 1.0,
      response_time_ms: 100,
      created_at: new Date().toISOString()
    };

    // Try to insert
    const { data: insertData, error: insertError } = await supabase
      .from('qa_validation_results')
      .insert(testResult)
      .select()
      .single();

    // Check with anon key
    const supabaseAnon = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    );

    const { data: anonData, error: anonError } = await supabaseAnon
      .from('qa_validation_results')
      .select('*')
      .limit(5);

    // Clean up test data if inserted
    if (insertData && insertData.id) {
      await supabase
        .from('qa_validation_results')
        .delete()
        .eq('id', insertData.id);
    }

    // Count total results with service role
    const { count: totalCount } = await supabase
      .from('qa_validation_results')
      .select('*', { count: 'exact', head: true });

    // Count visible results with anon
    const { count: anonCount } = await supabaseAnon
      .from('qa_validation_results')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        success: true,
        insert: {
          success: !insertError,
          error: insertError?.message,
          data: insertData ? 'Inserted successfully' : null
        },
        anon_access: {
          success: !anonError,
          error: anonError?.message,
          visible_count: anonCount || 0
        },
        service_role_count: totalCount || 0,
        rls_blocking: totalCount !== anonCount,
        message: totalCount === anonCount ? 
          'No RLS blocking - results should be visible' : 
          `RLS is blocking - ${totalCount} total but only ${anonCount} visible to anon`
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