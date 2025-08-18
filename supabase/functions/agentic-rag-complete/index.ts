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
    
    // Normalize model name
    let model = requestData.model || 'gpt-4-turbo-preview';
    if (model.includes('/')) {
      model = model.split('/')[1];
    }
    if (model === 'gpt-4-turbo-2024-04-09' || model === 'gpt-4-turbo') {
      model = 'gpt-4-turbo-preview';
    }
    
    const sessionId = requestData.sessionId || `session-${Date.now()}`;
    const userId = requestData.userId || 'anonymous';
    const bypassCache = requestData.bypassCache !== false;

    console.log('🎯 RAG Completo - Processing query:', query);
    console.log('🤖 Model:', model);
    console.log('📚 Using complete knowledge base with full hierarchy');

    // Step 1: Check cache first
    if (!bypassCache) {
      const { data: cachedResult } = await supabase
        .from('query_cache')
        .select('*')
        .eq('query', query.toLowerCase())
        .single();

      if (cachedResult && cachedResult.response) {
        console.log('✅ Cache hit!');
        return new Response(
          JSON.stringify({
            response: cachedResult.response,
            confidence: cachedResult.confidence || 0.95,
            sources: { 
              legal_articles: true,
              cached: true 
            },
            executionTime: 50
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Generate embedding for the query
    console.log('🔍 Generating embedding...');
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

    // Step 3: Search in COMPLETE legal_articles table (articles + hierarchy)
    console.log('🔎 Searching complete legal knowledge base...');
    
    // Create RPC function for searching legal_articles
    const searchQuery = `
      SELECT 
        la.id,
        la.document_type,
        la.article_number,
        la.full_content,
        la.article_text,
        la.keywords,
        1 - (la.embedding <=> $1::vector) as similarity
      FROM legal_articles la
      WHERE 
        la.embedding IS NOT NULL
        AND 1 - (la.embedding <=> $1::vector) > $2
      ORDER BY la.embedding <=> $1::vector
      LIMIT $3
    `;

    // Use raw SQL query
    const { data: legalResults, error: legalError } = await supabase
      .rpc('match_legal_articles', {
        query_embedding: queryEmbedding,
        match_threshold: 0.65,  // Lower threshold to catch more context
        match_count: 10  // Get more results for better context
      })
      .catch(() => {
        // If RPC doesn't exist, fallback to direct query
        return supabase
          .from('legal_articles')
          .select('*')
          .not('embedding', 'is', null)
          .limit(10);
      });

    // Also search in document_sections for additional context
    const { data: sectionDocuments } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3
    }).catch(() => ({ data: null }));

    // Combine all results
    let allDocuments = [];
    let hierarchyContext = [];
    let articleContext = [];
    
    if (legalResults && legalResults.length > 0) {
      console.log(`📚 Found ${legalResults.length} results from legal_articles`);
      
      // Separate articles from hierarchy elements
      legalResults.forEach((doc: any) => {
        if (doc.article_number < 9000) {
          // Real articles (1-340)
          articleContext.push(doc);
        } else {
          // Hierarchy elements (9000+)
          hierarchyContext.push(doc);
        }
      });
      
      console.log(`  → ${articleContext.length} artigos`);
      console.log(`  → ${hierarchyContext.length} elementos hierárquicos`);
      
      allDocuments = [...legalResults];
    }
    
    if (sectionDocuments && sectionDocuments.length > 0) {
      console.log(`📄 Found ${sectionDocuments.length} additional results from document_sections`);
      allDocuments = [...allDocuments, ...sectionDocuments];
    }

    // If no results, try text search as fallback
    if (allDocuments.length === 0) {
      console.log('⚠️ Vector search failed, trying text search...');
      
      // Search in legal_articles by keywords
      const { data: keywordResults } = await supabase
        .from('legal_articles')
        .select('*')
        .or(`full_content.ilike.%${query}%,article_text.ilike.%${query}%`)
        .limit(10);
      
      if (keywordResults && keywordResults.length > 0) {
        console.log(`📝 Found ${keywordResults.length} results via text search`);
        allDocuments = keywordResults;
      }
    }

    // Check if no documents found
    if (!allDocuments || allDocuments.length === 0) {
      return new Response(
        JSON.stringify({
          response: `Não encontrei informações específicas sobre "${query}" na base de conhecimento completa do PDPOA. 

A base inclui:
• 217 artigos do PDUS (Plano Diretor Urbano Sustentável)
• 123 artigos da LUOS (Lei de Uso e Ocupação do Solo)
• Partes, Títulos, Capítulos, Seções
• Parágrafos, Incisos e Alíneas

Por favor, tente reformular sua pergunta ou consulte sobre temas específicos como zoneamento, altura máxima, uso do solo, etc.`,
          confidence: 0.3,
          sources: { 
            legal_articles: 0,
            document_sections: 0 
          },
          executionTime: Date.now() - Date.now()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Build enriched context
    console.log(`📚 Building context from ${allDocuments.length} documents`);
    
    // Build context with hierarchy awareness
    let contextParts = [];
    
    // Add hierarchy elements first for context
    if (hierarchyContext.length > 0) {
      contextParts.push("=== CONTEXTO HIERÁRQUICO ===");
      hierarchyContext.forEach((doc: any) => {
        const docType = doc.document_type || 'PDPOA';
        const content = doc.full_content || doc.article_text || doc.content || '';
        contextParts.push(`[${docType}] ${content}`);
      });
    }
    
    // Add articles
    if (articleContext.length > 0) {
      contextParts.push("\n=== ARTIGOS RELEVANTES ===");
      articleContext.forEach((doc: any) => {
        const docType = doc.document_type || 'PDPOA';
        const artNum = doc.article_number;
        const content = doc.full_content || doc.article_text || doc.content || '';
        contextParts.push(`[${docType} - Art. ${artNum}º] ${content}`);
      });
    }
    
    // Add additional sections
    if (sectionDocuments && sectionDocuments.length > 0) {
      contextParts.push("\n=== DOCUMENTOS ADICIONAIS ===");
      sectionDocuments.forEach((doc: any) => {
        const source = doc.metadata?.source || 'Documento';
        contextParts.push(`[${source}] ${doc.content}`);
      });
    }
    
    const context = contextParts.join('\n\n');

    // Step 5: Generate response using GPT with enriched prompt
    console.log('🤖 Generating response with full hierarchy context...');
    
    const systemPrompt = `Você é um assistente especializado no Plano Diretor de Porto Alegre (PDUS 2025) e legislação urbanística (LUOS).

IMPORTANTE: Você tem acesso à BASE COMPLETA de conhecimento que inclui:
- 217 artigos do PDUS (Plano Diretor Urbano Sustentável)
- 123 artigos da LUOS (Lei de Uso e Ocupação do Solo)  
- Toda hierarquia legal: Partes, Títulos, Capítulos, Seções
- Todos os Parágrafos, Incisos e Alíneas

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro
2. Cite artigos específicos quando relevante (ex: "Conforme Art. 75 da LUOS...")
3. Considere a hierarquia completa (não apenas artigos isolados)
4. Use o contexto hierárquico para dar respostas mais completas
5. Se a informação estiver em parágrafos ou incisos, mencione-os
6. Formate a resposta de forma clara e estruturada

CONTEXTO DISPONÍVEL:
${context}`;

    const startTime = Date.now();

    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.includes('gpt') ? model : 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 1500,  // More tokens for complete answers
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
      confidence: 0.9,
      model: model,
      execution_time: executionTime,
      created_at: new Date().toISOString()
    }).catch(err => console.error('Cache error:', err));

    // Save to chat history
    await supabase.from('chat_history').insert({
      session_id: sessionId,
      user_id: userId,
      message: query,
      response: response,
      model: model,
      confidence: 0.9,
      execution_time: executionTime,
      created_at: new Date().toISOString()
    }).catch(err => console.error('History error:', err));

    return new Response(
      JSON.stringify({
        response: response,
        confidence: 0.9,
        sources: { 
          legal_articles: articleContext.length,
          hierarchy_elements: hierarchyContext.length,
          document_sections: sectionDocuments?.length || 0,
          total: allDocuments.length
        },
        executionTime: executionTime,
        model: model,
        context_summary: {
          articles_used: articleContext.length,
          hierarchy_used: hierarchyContext.length,
          pdus_sources: allDocuments.filter((d: any) => d.document_type === 'PDUS').length,
          luos_sources: allDocuments.filter((d: any) => d.document_type === 'LUOS').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agentic-rag-complete:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        confidence: 0,
        sources: { error: true },
        executionTime: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});