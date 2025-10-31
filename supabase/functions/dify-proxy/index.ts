import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseUrl, endpoint, headers: clientHeaders, body } = await req.json();

    console.log('🔄 [Dify Proxy] Proxying request:', {
      baseUrl,
      endpoint,
      hasBody: !!body
    });

    const fullUrl = `${baseUrl}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify(body),
    });

    console.log('✅ [Dify Proxy] Response received:', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });

    // Se for streaming (SSE), retornar stream diretamente
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('📡 [Dify Proxy] Forwarding SSE stream');
      
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Caso contrário, retornar JSON
    const data = await response.text();
    
    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      status: response.status,
    });

  } catch (error) {
    console.error('❌ [Dify Proxy] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Dify proxy encountered an error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
