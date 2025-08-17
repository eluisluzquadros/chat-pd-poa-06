import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  query: string;
  model?: string;
  sessionId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, model = "zhipuai/glm-4-plus", sessionId } = await req.json() as RequestBody;
    
    console.log(`🔍 FASE 1 SIMPLIFICADA V3: Busca vetorial para: "${query}"`);
    const startTime = Date.now();

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. GERAR EMBEDDING
    console.log(`📡 Gerando embedding para: "${query}"`);
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-text-embedding', {
      body: { input: query }
    });

    if (embeddingError || !embeddingData?.embedding) {
      throw new Error(`Erro ao gerar embedding: ${embeddingError?.message}`);
    }

    const queryEmbedding = embeddingData.embedding;
    console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);

    // 2. BUSCA VETORIAL DIRETA
    console.log(`🎯 Executando busca vetorial direta...`);
    const { data: searchResults, error: searchError } = await supabase.rpc('match_hierarchical_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 10
    });

    if (searchError) {
      throw new Error(`Erro na busca vetorial: ${searchError.message}`);
    }

    const validResults = searchResults?.filter(result => 
      result.similarity > 0.7 && 
      result.content?.trim()?.length > 20
    ) || [];

    console.log(`📊 Resultados válidos: ${validResults.length}`);

    if (validResults.length === 0) {
      return new Response(JSON.stringify({
        response: "Não encontrei informações específicas sobre essa consulta na base de conhecimento.",
        confidence: 0.1,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. CONSTRUIR CONTEXTO
    const context = validResults
      .slice(0, 5)
      .map(result => result.content)
      .join('\n\n');

    console.log(`📝 Contexto construído: ${context.substring(0, 200)}...`);

    // 4. CHAMAR LLM
    console.log(`🤖 Enviando para LLM (${model})...`);
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    
    const prompt = `Com base EXCLUSIVAMENTE nas informações fornecidas, responda à pergunta do usuário de forma precisa e completa.

CONTEXTO DOS DOCUMENTOS:
${context}

PERGUNTA: ${query}

INSTRUÇÕES:
- Use APENAS as informações fornecidas no contexto
- Cite artigos, leis ou números específicos quando disponíveis
- Se a informação não estiver no contexto, diga claramente que não foi encontrada
- Seja direto e objetivo`;

    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    const llmData = await llmResponse.json();
    const finalResponse = llmData.choices[0].message.content;
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Resposta final V3 gerada em ${executionTime}ms`);

    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: 0.9,
      sources: { tabular: 0, conceptual: validResults.length },
      executionTime,
      metadata: {
        version: 'v3-simplified',
        resultsFound: validResults.length,
        queryLength: query.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na função agentic-rag-v3:', error);
    return new Response(JSON.stringify({
      error: error.message,
      response: "Ocorreu um erro ao processar sua consulta. Tente novamente.",
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});