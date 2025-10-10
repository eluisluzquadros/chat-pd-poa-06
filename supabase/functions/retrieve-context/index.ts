import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetrievalResult {
  text: string;
  score: number;
  metadata?: Record<string, any>;
  source?: string;
}

interface LlamaCloudNode {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

interface LlamaCloudResponse {
  nodes: LlamaCloudNode[];
}

async function retrieveFromLlamaCloud(
  query: string,
  indexId: string,
  apiKey: string,
  topK: number,
  scoreThreshold: number
): Promise<RetrievalResult[]> {
  console.log('🔍 [LlamaCloud] Using /chat endpoint...', { indexId, topK });
  
  const chatPayload = {
    messages: [{ role: 'user', content: query }],
    data: {
      retrieval_parameters: {
        dense_similarity_top_k: topK,
        dense_similarity_cutoff: 0,
        sparse_similarity_top_k: topK,
        enable_reranking: true,
        rerank_top_n: Math.min(topK, 10),
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
    stream: false,
  };

  console.log('📤 Query sent to LlamaCloud /chat:', {
    indexId,
    queryPreview: query.substring(0, 100),
    retrieval_mode: 'chunks',
    top_k: topK,
  });

  const response = await fetch(
    `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [LlamaCloud] Error:', response.status, errorText);
    throw new Error(`LlamaCloud API error: ${response.status}`);
  }

  const responseText = await response.text();
  console.log('📥 Raw response (first 300 chars):', responseText.substring(0, 300));

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    console.error('📄 Full response:', responseText);
    throw new Error(`Failed to parse LlamaCloud response: ${parseError.message}`);
  }

  const sources = data.sources || [];
  
  console.log('📥 LlamaCloud response:', {
    sourcesCount: sources.length,
    firstSourceScore: sources[0]?.score || 'N/A',
    firstSourcePreview: sources[0]?.text?.substring(0, 50) || 'N/A',
  });

  return sources.map((source: any) => ({
    text: source.text,
    score: source.score,
    metadata: source.metadata,
    source: 'llamacloud',
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, query } = await req.json();

    if (!agentId || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing agentId or query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔎 [retrieve-context] Starting retrieval for agent:', agentId);

    // Get agent's knowledge bases
    const { data: agentKBs, error: agentKBError } = await supabaseClient
      .from('agent_knowledge_bases')
      .select(`
        *,
        knowledge_base:external_knowledge_bases(*)
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (agentKBError) {
      console.error('❌ Error fetching agent KBs:', agentKBError);
      throw agentKBError;
    }

    if (!agentKBs || agentKBs.length === 0) {
      console.log('⚠️ No knowledge bases configured for this agent');
      return new Response(
        JSON.stringify({ context: '', sources: [], message: 'No knowledge bases configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📚 Found ${agentKBs.length} knowledge base(s)`);

    // Get secrets from Edge Function Secrets
    const secretsMap: Record<string, string> = {
      LLAMACLOUD_API_KEY: Deno.env.get('LLAMACLOUD_API_KEY') || '',
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
    };

    console.log('✅ Secrets loaded from environment:', Object.keys(secretsMap).filter(k => secretsMap[k]));

    // Retrieve from all knowledge bases
    const allResults: RetrievalResult[] = [];

    for (const agentKB of agentKBs) {
      const kb = agentKB.knowledge_base;
      if (!kb || !kb.is_active) continue;

      console.log(`🔍 Retrieving from KB: ${kb.display_name} (${kb.provider})`);

      try {
        const config = kb.config || {};
        const settings = kb.retrieval_settings || { top_k: 5, score_threshold: 0.3 };

        if (kb.provider === 'llamacloud') {
          const indexId = config.index_id;
          const apiKeySecretName = config.api_key_secret_name || 'LLAMACLOUD_API_KEY';
          const apiKey = secretsMap[apiKeySecretName];

          if (!indexId || !apiKey) {
            console.warn(`⚠️ Missing config for LlamaCloud KB: ${kb.display_name}`);
            continue;
          }

          const results = await retrieveFromLlamaCloud(
            query,
            indexId,
            apiKey,
            settings.top_k,
            settings.score_threshold
          );

          allResults.push(...results.map(r => ({
            ...r,
            source: kb.display_name,
          })));
        } else {
          console.warn(`⚠️ Unsupported provider: ${kb.provider}`);
        }
      } catch (error) {
        console.error(`❌ Error retrieving from KB ${kb.display_name}:`, error);
      }
    }

    // Sort by score and combine
    allResults.sort((a, b) => b.score - a.score);

    const context = allResults
      .slice(0, 10) // Limit to top 10
      .map((r, i) => `[${i + 1}] (Score: ${r.score.toFixed(3)}) ${r.text}`)
      .join('\n\n');

    const sources = allResults.slice(0, 10).map(r => ({
      source: r.source,
      score: r.score,
      metadata: r.metadata,
    }));

    console.log(`✅ Retrieved ${allResults.length} total results`);

    return new Response(
      JSON.stringify({ context, sources, resultsCount: allResults.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔥 Error in retrieve-context:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
