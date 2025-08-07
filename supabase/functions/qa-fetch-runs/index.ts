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

    const { limit = 20 } = await req.json().catch(() => ({ limit: 20 }));

    // Fetch validation runs using service role key (bypasses RLS)
    const { data: runs, error: runsError } = await supabase
      .from('qa_validation_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (runsError) {
      console.error('Error fetching runs:', runsError);
      throw new Error(`Error fetching runs: ${runsError.message}`);
    }

    // Fetch test cases
    const { data: cases, error: casesError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (casesError) {
      console.error('Error fetching test cases:', casesError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        runs: runs || [],
        testCases: cases || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-fetch-runs:', error);
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