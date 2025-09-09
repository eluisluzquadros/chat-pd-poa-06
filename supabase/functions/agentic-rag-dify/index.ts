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
    console.log('🚀 Agentic RAG v2 Proxy - Processing request');
    
    const { originalQuery, user_role = 'citizen' } = await req.json();
    
    // Get Dify configuration from environment
    const difyApiKey = Deno.env.get('DIFY_API_KEY');
    const difyApiUrl = Deno.env.get('DIFY_API_URL') || 'https://api.dify.ai/v1';
    const difyAppToken = Deno.env.get('DIFY_APP_TOKEN');
    
    if (!difyApiKey || !difyAppToken) {
      throw new Error('External Agent credentials not configured');
    }
    
    console.log('📡 Calling External Agent API with query:', originalQuery);
    
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
      console.error('❌ External Agent API error:', errorText);
      throw new Error(`External Agent API error: ${difyResponse.status} - ${errorText}`);
    }
    
    const difyData = await difyResponse.json();
    console.log('✅ External Agent response received:', JSON.stringify(difyData, null, 2));
    
    const executionTime = Date.now() - startTime;
    
    // Map External Agent response to expected format - PRESERVE ORIGINAL RESPONSE
    const originalResponse = difyData.answer || difyData.message || 'No response from External Agent';
    
    const mappedResponse = {
      response: originalResponse, // DO NOT MODIFY - Return exactly as received from Dify
      confidence: 0.85, // Default confidence for agentic-rag-v2 responses
      sources: { 
        external: 1,
        agenticV2: true 
      },
      executionTime,
      metadata: {
        provider: 'agentic-rag-v2',
        conversationId: difyData.conversation_id,
        messageId: difyData.id,
        external: true,
        model: 'agentic-rag-v2'
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
      provider: 'agentic-rag-v2',
      fallback_suggestion: 'Consider using agentic-rag-v1 endpoint'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});