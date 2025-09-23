import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Count all test cases
    const { count: totalCount } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });

    // Test 2: Count active test cases
    const { count: activeCount } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Test 3: Get all active test cases
    const { data: activeCases, error } = await supabase
      .from('qa_test_cases')
      .select('id, question, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    // Test 4: Get first 5 test cases without filter
    const { data: firstFive } = await supabase
      .from('qa_test_cases')
      .select('id, question, is_active')
      .order('created_at', { ascending: true })
      .limit(5);

    return new Response(JSON.stringify({
      totalCount,
      activeCount,
      activeCasesFound: activeCases?.length || 0,
      activeCases: activeCases?.slice(0, 5),
      firstFiveAnyStatus: firstFive,
      error
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});