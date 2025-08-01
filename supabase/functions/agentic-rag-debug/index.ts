
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const debugInfo = {
    steps: [],
    errors: []
  };

  try {
    debugInfo.steps.push({ step: 'start', time: new Date().toISOString() });
    
    // Parse request
    const requestBody = await req.json();
    const { query, message } = requestBody;
    const userMessage = message || query || '';
    
    debugInfo.steps.push({ 
      step: 'parsed_request', 
      userMessage,
      hasQuery: !!query,
      hasMessage: !!message 
    });

    // Check environment
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
    const hasAnthropic = !!Deno.env.get('ANTHROPIC_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    debugInfo.steps.push({ 
      step: 'checked_env',
      hasOpenAI,
      hasAnthropic,
      hasSupabaseUrl: !!supabaseUrl
    });

    // Try to call query-analyzer
    debugInfo.steps.push({ step: 'calling_query_analyzer' });
    
    try {
      const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          query: userMessage,
          sessionId: 'test'
        }),
      });

      debugInfo.steps.push({ 
        step: 'query_analyzer_response',
        status: analysisResponse.status,
        ok: analysisResponse.ok
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        debugInfo.errors.push({
          step: 'query_analyzer',
          error: errorText.substring(0, 500)
        });
      } else {
        const result = await analysisResponse.json();
        debugInfo.steps.push({ 
          step: 'query_analyzer_result',
          intent: result.intent,
          strategy: result.strategy
        });
      }
    } catch (error) {
      debugInfo.errors.push({
        step: 'query_analyzer_call',
        error: error.message,
        stack: error.stack
      });
    }

    // Return debug info
    return new Response(JSON.stringify({
      success: false,
      message: 'Debug mode - check debugInfo',
      debugInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      debugInfo
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
