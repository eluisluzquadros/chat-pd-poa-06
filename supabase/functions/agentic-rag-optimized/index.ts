import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, model = 'gpt-4-turbo-preview', bypassCache = false } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Normalize query for cache lookup
    const normalizedQuery = message.toLowerCase().trim();
    
    // Step 1: Check cache first (unless bypassed)
    if (!bypassCache) {
      const { data: cachedResponse } = await supabase
        .from('query_cache')
        .select('response, confidence, metadata')
        .eq('query', normalizedQuery)
        .single();
      
      if (cachedResponse && cachedResponse.response) {
        console.log('Cache hit for query:', normalizedQuery);
        return new Response(
          JSON.stringify({
            response: cachedResponse.response,
            confidence: cachedResponse.confidence || 0.9,
            cached: true,
            metadata: cachedResponse.metadata
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: message,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI Embedding API error:', error);
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 3: Check semantic cache (find similar cached queries)
    if (!bypassCache) {
      const { data: semanticCache } = await supabase.rpc('find_cached_response', {
        query_text: normalizedQuery,
        query_embedding: queryEmbedding,
        similarity_threshold: 0.95
      });
      
      if (semanticCache && semanticCache.length > 0) {
        const cached = semanticCache[0];
        console.log('Semantic cache hit with similarity:', cached.similarity);
        return new Response(
          JSON.stringify({
            response: cached.response,
            confidence: cached.confidence || 0.85,
            cached: true,
            semantic_match: true,
            similarity: cached.similarity
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 4: Search for similar documents using pgvector
    const { data: sectionDocuments, error: searchError } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('Document search error:', searchError);
      throw searchError;
    }

    // Step 5: Search structured data if needed
    let structuredData = null;
    const queryLower = message.toLowerCase();
    
    if (queryLower.includes('altura') || queryLower.includes('taxa') || queryLower.includes('coeficiente')) {
      // Search for neighborhood parameters
      const neighborhood = extractNeighborhood(message);
      if (neighborhood) {
        const { data } = await supabase
          .from('regime_urbanistico')
          .select('*')
          .ilike('bairro', `%${neighborhood}%`)
          .limit(1)
          .single();
        
        if (data) {
          structuredData = formatRegimeData(data);
        }
      }
    }

    // Step 6: Combine context
    let context = '';
    
    if (sectionDocuments && sectionDocuments.length > 0) {
      context += 'Documentos relevantes:\n\n';
      sectionDocuments.forEach((doc: any, index: number) => {
        context += `${index + 1}. ${doc.content.substring(0, 500)}...\n\n`;
      });
    }
    
    if (structuredData) {
      context += '\nDados estruturados:\n' + structuredData + '\n';
    }

    // Step 7: Generate response with GPT-4
    const systemPrompt = `Você é um assistente especializado no Plano Diretor de Porto Alegre (PDUS 2025) e legislação urbanística.
    
Regras importantes:
1. Responda SEMPRE em português brasileiro
2. Seja preciso e cite artigos/números quando disponível
3. Se não tiver certeza, indique isso claramente
4. Use o contexto fornecido para basear sua resposta
5. Mantenha respostas concisas mas completas`;

    const userPrompt = `Contexto:\n${context}\n\nPergunta: ${message}\n\nResponda de forma clara e precisa.`;

    // Normalize model name
    let normalizedModel = model;
    if (model.includes('/')) {
      normalizedModel = model.split('/')[1];
    }
    if (normalizedModel === 'gpt-4-turbo-2024-04-09' || normalizedModel === 'gpt-4-turbo') {
      normalizedModel = 'gpt-4-turbo-preview';
    }

    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalizedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!completionResponse.ok) {
      const error = await completionResponse.text();
      console.error('OpenAI Completion API error:', error);
      throw new Error(`OpenAI API error: ${completionResponse.status}`);
    }

    const completionData = await completionResponse.json();
    const response = completionData.choices[0].message.content;

    // Calculate confidence based on context quality
    const confidence = calculateConfidence(sectionDocuments, structuredData);

    // Step 8: Cache the response for future use
    try {
      await supabase.from('query_cache').insert({
        query: normalizedQuery,
        query_embedding: queryEmbedding,
        response: response,
        confidence: confidence,
        metadata: {
          model: normalizedModel,
          context_docs: sectionDocuments?.length || 0,
          has_structured_data: !!structuredData,
          created_at: new Date().toISOString()
        }
      });
      console.log('Response cached successfully');
    } catch (cacheError) {
      console.error('Cache insert error:', cacheError);
      // Continue even if caching fails
    }

    // Return the response
    return new Response(
      JSON.stringify({
        response,
        confidence,
        cached: false,
        contextDocuments: sectionDocuments?.length || 0,
        hasStructuredData: !!structuredData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agentic-rag-optimized:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.',
        confidence: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractNeighborhood(query: string): string | null {
  const neighborhoods = [
    'centro', 'cidade baixa', 'menino deus', 'petrópolis', 'moinhos de vento',
    'bom fim', 'floresta', 'navegantes', 'auxiliadora', 'mont serrat',
    'santana', 'cristal', 'teresópolis', 'tristeza', 'ipanema'
  ];
  
  const queryLower = query.toLowerCase();
  for (const neighborhood of neighborhoods) {
    if (queryLower.includes(neighborhood)) {
      return neighborhood;
    }
  }
  
  return null;
}

function formatRegimeData(data: any): string {
  return `
Bairro: ${data.bairro}
Zona: ${data.zona || 'N/A'}
Altura Máxima: ${data.altura_maxima || 'N/A'}
Taxa de Ocupação: ${data.taxa_ocupacao || 'N/A'}
Índice de Aproveitamento: ${data.indice_aproveitamento || 'N/A'}
Recuo Frontal: ${data.recuo_frontal || 'N/A'}m
`;
}

function calculateConfidence(documents: any[], structuredData: any): number {
  let confidence = 0.5; // Base confidence
  
  if (documents && documents.length > 0) {
    // Add confidence based on document similarity
    const avgSimilarity = documents.reduce((sum: number, doc: any) => sum + (doc.similarity || 0), 0) / documents.length;
    confidence += avgSimilarity * 0.3;
  }
  
  if (structuredData) {
    // Add confidence for having structured data
    confidence += 0.2;
  }
  
  // Cap at 0.95
  return Math.min(confidence, 0.95);
}