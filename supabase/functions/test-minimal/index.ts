
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    // Verificar se as API keys estão disponíveis
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
    const hasAnthropic = !!Deno.env.get('ANTHROPIC_API_KEY');
    const hasGemini = !!Deno.env.get('GEMINI_API_KEY');
    
    return new Response(JSON.stringify({
      success: true,
      message: `Recebi: ${message}`,
      apis: {
        openai: hasOpenAI,
        anthropic: hasAnthropic,
        gemini: hasGemini
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
