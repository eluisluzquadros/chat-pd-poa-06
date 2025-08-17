import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    console.log(`🔍 FASE 1 SIMPLIFICADA: Busca vetorial para: "${query}"`);
    const startTime = Date.now();

    // Inicializar Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PASSO 1: Gerar embedding da query
    console.log('📝 Gerando embedding para a query...');
    const { data: embeddingData, error: embeddingError } = await supabaseClient.functions.invoke('generate-text-embedding', {
      body: { text: query }
    });

    if (embeddingError || !embeddingData?.embedding) {
      throw new Error(`Erro ao gerar embedding: ${embeddingError?.message || 'Embedding vazio'}`);
    }

    const queryEmbedding = embeddingData.embedding;
    console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);

    // PASSO 2: Busca vetorial direta
    console.log('🎯 Executando busca vetorial hierárquica...');
    const { data: vectorResults, error: vectorError } = await supabaseClient.rpc('match_hierarchical_documents', {
      query_embedding: queryEmbedding,
      match_count: 10,
      query_text: query
    });

    if (vectorError) {
      console.error('❌ Erro na busca vetorial:', vectorError);
      throw new Error(`Erro na busca vetorial: ${vectorError.message}`);
    }

    console.log(`🔍 Busca vetorial retornou ${vectorResults?.length || 0} resultados`);

    // PASSO 3: Filtrar e classificar resultados
    const validResults = (vectorResults || [])
      .filter(result => result.similarity > 0.3)
      .slice(0, 5);

    console.log(`✅ ${validResults.length} resultados válidos após filtro`);

    if (validResults.length === 0) {
      return new Response(JSON.stringify({
        response: "Desculpe, não encontrei informações específicas sobre sua consulta na base de conhecimento do Plano Diretor de Porto Alegre. Poderia reformular a pergunta?",
        confidence: 0.1,
        sources: { conceptual: 0, tabular: 0 },
        executionTime: Date.now() - startTime,
        queryType: "vetorial",
        strategyUsed: "busca_vetorial_sem_resultados"
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // PASSO 4: Preparar contexto para LLM
    const contextChunks = validResults.map((result, index) => 
      `[FONTE ${index + 1}] ${result.content_chunk}`
    ).join('\n\n');

    // PASSO 5: Gerar resposta com LLM
    console.log('🤖 Gerando resposta com LLM...');
    const llmPrompt = `Você é um assistente especialista em legislação urbana de Porto Alegre.

CONSULTA DO USUÁRIO: ${query}

CONTEXTO RELEVANTE DA BASE DE CONHECIMENTO:
${contextChunks}

INSTRUÇÕES:
1. Responda APENAS com base no contexto fornecido
2. Se houver artigos específicos, cite-os explicitamente (ex: "Art. 81 - III")
3. Se houver números ou dados específicos, inclua-os
4. Se o contexto não for suficiente, diga que precisa de mais informações
5. Mantenha a resposta objetiva e técnica
6. Use linguagem clara e acessível

RESPOSTA:`;

    const llmResponse = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: llmPrompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!llmResponse.ok) {
      throw new Error(`Erro na API do LLM: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const response = llmData.choices?.[0]?.message?.content || "Erro ao gerar resposta";

    // PASSO 6: Calcular métricas
    const avgSimilarity = validResults.reduce((sum, r) => sum + r.similarity, 0) / validResults.length;
    const confidence = Math.min(avgSimilarity * 1.2, 0.95); // Boost pequeno, max 95%
    const executionTime = Date.now() - startTime;

    console.log(`✅ FASE 1 COMPLETA: ${executionTime}ms, confiança: ${confidence.toFixed(2)}, fontes: ${validResults.length}`);

    return new Response(JSON.stringify({
      response,
      confidence,
      sources: { 
        conceptual: validResults.length, 
        tabular: 0 
      },
      executionTime,
      queryType: "vetorial",
      strategyUsed: "busca_vetorial_hierarquica",
      debug: {
        embeddingDimensions: queryEmbedding.length,
        vectorResults: vectorResults?.length || 0,
        validResults: validResults.length,
        avgSimilarity: avgSimilarity.toFixed(3)
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ ERRO FASE 1:', error);
    return new Response(JSON.stringify({
      response: "Erro interno do sistema. Tente novamente.",
      error: error.message,
      confidence: 0,
      sources: { conceptual: 0, tabular: 0 },
      executionTime: 0,
      queryType: "erro",
      strategyUsed: "erro_interno"
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});