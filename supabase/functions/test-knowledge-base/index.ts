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
    const { provider, index_id, api_key, top_k = 3, score_threshold = 0.3 } = await req.json();

    console.log('🧪 Testing KB:', {
      provider,
      index_id,
      api_key: api_key?.substring(0, 10) + '...',
      top_k,
      score_threshold,
    });

    if (!index_id || !api_key) {
      throw new Error('Index ID e API Key são obrigatórios');
    }

    if (provider !== 'llamacloud') {
      throw new Error('Apenas LlamaCloud suportado por enquanto');
    }

    const testQuery = 'regulamento urbanístico teste';
    console.log('📤 Test query:', testQuery);

    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${index_id}/retrieve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testQuery,
          top_k,
          similarity_cutoff: score_threshold,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LlamaCloud API error:', response.status, errorText);
      throw new Error(`LlamaCloud API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const nodes = data.nodes || [];

    console.log('📥 Test results:', {
      nodesRetrieved: nodes.length,
      scores: nodes.map((n: any) => n.score),
    });

    if (nodes.length === 0) {
      const result = {
        success: true,
        message: '⚠️ Conexão OK, mas nenhum documento encontrado. Verifique se o index tem documentos.',
        details: {
          nodesRetrieved: 0,
          query: testQuery,
        },
      };
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const avgScore = nodes.reduce((sum: number, n: any) => sum + n.score, 0) / nodes.length;
    const result = {
      success: true,
      message: `✅ Conexão OK! ${nodes.length} documento(s) encontrado(s)`,
      details: {
        nodesRetrieved: nodes.length,
        avgScore,
        topScores: nodes.map((n: any) => n.score),
        query: testQuery,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    const result = {
      success: false,
      message: `❌ Erro: ${error.message || 'Falha na conexão'}`,
    };
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
