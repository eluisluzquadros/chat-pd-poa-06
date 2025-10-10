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

    const chatPayload = {
      messages: [{ role: 'user', content: testQuery }],
      data: {
        retrieval_parameters: {
          dense_similarity_top_k: top_k || 30,
          dense_similarity_cutoff: 0,
          sparse_similarity_top_k: top_k || 30,
          enable_reranking: true,
          rerank_top_n: Math.min(top_k || 6, 10),
          alpha: 0.5,
          retrieval_mode: 'chunks',
          retrieve_page_screenshot_nodes: true,
          retrieve_page_figure_nodes: true,
        },
        llm_parameters: {
          model_name: 'GPT_4O_MINI',
          temperature: 0.1,
          use_citation: true,
        },
      },
    };

    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${index_id}/chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LlamaCloud API error:', response.status, errorText);
      throw new Error(`LlamaCloud API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sources = data.sources || [];

    console.log('📥 Test results:', {
      sourcesRetrieved: sources.length,
      scores: sources.map((s: any) => s.score),
      responsePreview: data.response?.substring(0, 100),
    });

    if (sources.length === 0) {
      const result = {
        success: true,
        message: '⚠️ Conexão OK, mas nenhum documento encontrado. Verifique se o index tem documentos.',
        details: {
          sourcesRetrieved: 0,
          query: testQuery,
          response: data.response,
        },
      };
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const avgScore = sources.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / sources.length;
    const result = {
      success: true,
      message: `✅ Conexão OK! ${sources.length} documento(s) encontrado(s)`,
      details: {
        sourcesRetrieved: sources.length,
        avgScore,
        topScores: sources.slice(0, 5).map((s: any) => s.score),
        query: testQuery,
        responsePreview: data.response?.substring(0, 200),
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
