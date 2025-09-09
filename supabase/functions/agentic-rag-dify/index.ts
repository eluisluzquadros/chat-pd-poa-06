import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('🚀 Dify RAG Proxy - Processing request');
    
    const { originalQuery, user_role = 'citizen' } = await req.json();
    
    // Get Dify configuration from environment
    const difyApiKey = Deno.env.get('DIFY_API_KEY');
    const difyApiUrl = Deno.env.get('DIFY_API_URL') || 'https://api.dify.ai/v1';
    const difyAppToken = Deno.env.get('DIFY_APP_TOKEN');
    
    if (!difyApiKey || !difyAppToken) {
      throw new Error('Dify credentials not configured');
    }
    
    console.log('📡 Calling Dify API with query:', originalQuery);
    
    // Map to Dify Chat Completion format
    const difyPayload = {
      inputs: {},
      query: originalQuery,
      response_mode: 'blocking',
      conversation_id: '',
      user: 'supabase-user'
    };
    
    const startTime = Date.now();
    
    // Call Dify API
    const difyResponse = await fetch(`${difyApiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyAppToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(difyPayload),
    });
    
    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('❌ Dify API error:', errorText);
      throw new Error(`Dify API error: ${difyResponse.status} - ${errorText}`);
    }
    
    const difyData = await difyResponse.json();
    console.log('✅ Dify response received:', JSON.stringify(difyData, null, 2));
    
    const executionTime = Date.now() - startTime;
    
    // Map Dify response to expected format
    const mappedResponse = {
      response: difyData.answer || difyData.message || 'No response from Dify',
      confidence: 0.85, // Default confidence for Dify responses
      sources: { 
        external: 1,
        dify: true 
      },
      executionTime,
      metadata: {
        provider: 'dify',
        conversationId: difyData.conversation_id,
        messageId: difyData.id,
        external: true,
        model: difyData.metadata?.model || 'dify-agent'
      }
    };
    
    console.log('🎯 Mapped response:', JSON.stringify(mappedResponse, null, 2));
    
    return new Response(JSON.stringify(mappedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Dify RAG Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      provider: 'dify',
      fallback_suggestion: 'Consider using local RAG endpoint'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});