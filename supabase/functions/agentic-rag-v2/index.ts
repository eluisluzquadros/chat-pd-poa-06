import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agentic-RAG v2 - Main Entry Point
 * Redireciona queries para o Master Orchestrator
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📨 Agentic-RAG v2 received request:', { 
      query: body.query || body.message,
      model: body.model,
      sessionId: body.sessionId 
    });
    
    // Forward to orchestrator-master
    const orchestratorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/orchestrator-master`;
    
    const response = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: body.query || body.message,
        sessionId: body.sessionId || `session_${Date.now()}`,
        model: body.model || 'gpt-3.5-turbo',
        options: {
          useAgenticRAG: true,
          bypassCache: body.bypassCache,
          ...body.options
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Orchestrator failed:', response.status, errorText);
      
      // TEMPORARILY DISABLED FALLBACK for debugging
      // Throw error to force debugging of orchestrator issues
      throw new Error(`Orchestrator failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Ensure proper response format
    const formattedResponse = {
      response: data.response || 'Não foi possível processar sua solicitação.',
      confidence: data.confidence || 0.5,
      sources: data.sources || { tabular: 0, conceptual: 0 },
      executionTime: data.executionTime || 0,
      metadata: {
        ...data.metadata,
        pipeline: 'agentic-v2',
        timestamp: new Date().toISOString()
      }
    };
    
    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agentic-RAG v2 error:', error);
    
    // Try legacy fallback in case of error
    try {
      const fallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/agentic-rag`;
      const body = await req.json();
      
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: body.query || body.message,
          userRole: body.userRole || 'citizen',
          sessionId: body.sessionId,
          userId: body.userId,
          bypassCache: body.bypassCache,
          model: body.model || 'gpt-3.5-turbo'
        })
      });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return new Response(JSON.stringify({
          ...fallbackData,
          metadata: {
            ...fallbackData.metadata,
            pipeline: 'legacy-error-fallback',
            error: error.message
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (fallbackError) {
      console.error('❌ Fallback error:', fallbackError);
    }
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      error: error.message,
      metadata: {
        pipeline: 'agentic-v2',
        error: true,
        errorMessage: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});