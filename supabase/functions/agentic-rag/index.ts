import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  query?: string;
  message?: string;
  sessionId?: string;
  userId?: string;
  userRole?: string;
  model?: string;
  bypassCache?: boolean;
  options?: {
    useAgenticRAG?: boolean;
    useKnowledgeGraph?: boolean;
    useHierarchicalChunks?: boolean;
    userRole?: string;
    userId?: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const requestData: QueryRequest = await req.json();
    const query = requestData.query || requestData.message || '';
    
    // Normalize model name (remove provider prefix if present)
    let model = requestData.model || 'gpt-4-turbo-preview';
    if (model.includes('/')) {
      model = model.split('/')[1]; // Remove "openai/" prefix
    }
    // Map specific model versions to supported ones
    if (model === 'gpt-4-turbo-2024-04-09' || model === 'gpt-4-turbo') {
      model = 'gpt-4-turbo-preview';
    }
    
    const sessionId = requestData.sessionId || `session-${Date.now()}`;
    const userId = requestData.userId || requestData.options?.userId || 'anonymous';
    const bypassCache = requestData.bypassCache !== false;

    console.log('🎯 Processing query:', query);
    console.log('🤖 Using model:', model);
    console.log('🔄 Bypass cache:', bypassCache);

    // Step 1: Check cache first (unless bypassed)
    if (!bypassCache) {
      const { data: cachedResult } = await supabase
        .from('query_cache')
        .select('*')
        .eq('query', query.toLowerCase())
        .single();

      if (cachedResult && cachedResult.response) {
        console.log('✅ Cache hit! Returning cached response');
        return new Response(
          JSON.stringify({
            response: cachedResult.response,
            confidence: cachedResult.confidence || 0.95,
            sources: { tabular: 1, conceptual: 0 },
            executionTime: 50,
            cached: true,
            agentTrace: [{
              type: 'cache',
              confidence: 0.95,
              executionTime: 50,
              hasData: true
            }]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Generate embedding for the query
    console.log('🔍 Generating embedding for query...');
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding generation failed: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 3: Search for similar documents using pgvector
    console.log('🔎 Searching for similar documents...');
    
    // Try match_document_sections first (main document content)
    const { data: sectionDocuments, error: sectionError } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
    });

    // Also try match_documents (for document_chunks if exists)
    const { data: chunkDocuments, error: chunkError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3
    });

    // Combine results from both searches
    let documents = [];
    
    if (sectionDocuments && !sectionError) {
      console.log(`📄 Found ${sectionDocuments.length} results from document_sections`);
      documents = [...documents, ...sectionDocuments];
    }
    
    if (chunkDocuments && !chunkError) {
      console.log(`📄 Found ${chunkDocuments.length} results from document_chunks`);
      documents = [...documents, ...chunkDocuments];
    }

    // If vector search failed, fallback to text search
    if (documents.length === 0) {
      console.log('⚠️ Vector search failed, trying text search...');
      const { data: textSearchResults } = await supabase
        .from('document_sections')
        .select('*')
        .textSearch('content', query)
        .limit(5);
      
      if (textSearchResults && textSearchResults.length > 0) {
        console.log('📝 Using text search results as fallback');
        documents = textSearchResults;
      }
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️ No documents found, searching in document_rows...');
      
      // Try searching in document_rows table
      const { data: rowData } = await supabase
        .from('document_rows')
        .select('*')
        .or(`content.ilike.%${query}%,metadata->nome_bairro.ilike.%${query}%`)
        .limit(10);

      if (rowData && rowData.length > 0) {
        console.log(`✅ Found ${rowData.length} results in document_rows`);
        const context = formatRowDataAsContext(rowData);
        return await generateResponse(query, context, model, openaiApiKey, supabase, sessionId, userId);
      }

      // No results found anywhere
      return new Response(
        JSON.stringify({
          response: `Não encontrei informações específicas sobre "${query}" na base de conhecimento. Por favor, tente reformular sua pergunta ou consulte sobre:\n\n• Artigos específicos (ex: "Art. 75 da LUOS")\n• Bairros de Porto Alegre (ex: "altura máxima em Petrópolis")\n• Zonas urbanas (ex: "parâmetros da ZOT-04")\n• Proteção contra enchentes (ex: "bairros protegidos")`,
          confidence: 0.3,
          sources: { tabular: 0, conceptual: 0 },
          executionTime: 1000,
          agentTrace: [{
            type: 'search',
            confidence: 0.3,
            executionTime: 1000,
            hasData: false
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Prepare context from found documents
    console.log(`📚 Found ${documents.length} relevant documents`);
    const context = documents.map((doc: any) => {
      return `[Fonte: ${doc.metadata?.source || 'Unknown'}]\n${doc.content}`;
    }).join('\n\n---\n\n');

    // Step 5: Generate response using GPT
    return await generateResponse(query, context, model, openaiApiKey, supabase, sessionId, userId);

  } catch (error) {
    console.error('Error in agentic-rag-v3:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        confidence: 0,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to generate response using GPT
async function generateResponse(
  query: string, 
  context: string, 
  model: string,
  apiKey: string,
  supabase: any,
  sessionId: string,
  userId: string
) {
  console.log('🤖 Generating response with GPT...');
  
  const systemPrompt = `Você é um assistente especializado no Plano Diretor de Porto Alegre (PDUS 2025) e legislação urbanística.

INSTRUÇÕES IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Seja preciso e cite artigos/fontes quando disponível
3. Use o contexto fornecido para basear sua resposta
4. Se não tiver certeza, indique isso claramente
5. Formate a resposta de forma clara e estruturada

CONTEXTO DISPONÍVEL:
${context}`;

  const startTime = Date.now();

  try {
    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.includes('gpt') ? model : 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!completionResponse.ok) {
      const errorData = await completionResponse.text();
      console.error('GPT API error:', errorData);
      throw new Error(`GPT API failed: ${completionResponse.statusText}`);
    }

    const completionData = await completionResponse.json();
    const response = completionData.choices[0].message.content;
    const executionTime = Date.now() - startTime;

    console.log('✅ Response generated successfully');

    // Cache the successful response
    await supabase.from('query_cache').upsert({
      query: query.toLowerCase(),
      response: response,
      confidence: 0.85,
      model: model,
      execution_time: executionTime,
      created_at: new Date().toISOString()
    });

    // Save to chat history
    await supabase.from('chat_history').insert({
      session_id: sessionId,
      user_id: userId,
      message: query,
      response: response,
      model: model,
      confidence: 0.85,
      execution_time: executionTime,
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        response: response,
        confidence: 0.85,
        sources: { 
          tabular: context.includes('[Fonte:') ? 1 : 0, 
          conceptual: context.length > 0 ? 1 : 0 
        },
        executionTime: executionTime,
        model: model,
        agentTrace: [{
          type: 'rag-pipeline',
          confidence: 0.85,
          executionTime: executionTime,
          steps: [
            'embedding_generation',
            'vector_search',
            'context_preparation',
            'gpt_generation'
          ]
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

// Helper function to format row data as context
function formatRowDataAsContext(rowData: any[]): string {
  return rowData.map(row => {
    const metadata = row.metadata || {};
    let formatted = '';
    
    if (metadata.nome_bairro) {
      formatted += `Bairro: ${metadata.nome_bairro}\n`;
    }
    if (metadata.zona) {
      formatted += `Zona: ${metadata.zona}\n`;
    }
    if (row.content) {
      formatted += `${row.content}\n`;
    }
    
    return formatted;
  }).join('\n---\n');
}