import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

  const startTime = Date.now();
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { model = 'agentic-rag' } = body;
    
    console.log(`Simple QA validation starting for model: ${model}`);
    
    // Create validation run
    const { data: validationRun, error: runError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model,
        status: 'running',
        total_tests: 38,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !validationRun) {
      throw new Error('Failed to create validation run');
    }

    console.log(`Created validation run: ${validationRun.id}`);
    
    // Return immediately with run info
    return new Response(JSON.stringify({
      success: true,
      validationRunId: validationRun.id,
      totalTests: 38,
      processedTests: 0,
      batchInfo: {
        startIndex: 0,
        endIndex: 1,
        batchSize: 1,
        hasMoreTests: true,
        nextStartIndex: 1
      },
      message: 'Validation run created successfully',
      executionTime: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Simple validator error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});