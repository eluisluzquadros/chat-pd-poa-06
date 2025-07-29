import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('QA Validator function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    // Resposta simples e imediata para teste
    return new Response(JSON.stringify({
      success: true,
      validationRunId: 'test-' + Date.now(),
      totalTests: 5,
      passedTests: 3,
      overallAccuracy: 0.6,
      avgResponseTime: 1000,
      message: 'Test response - function is working'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Function minimal test'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});