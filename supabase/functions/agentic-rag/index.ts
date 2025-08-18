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

// Multi-LLM configuration
const LLM_PROVIDERS = {
  // OpenAI Models
  'openai/gpt-4-turbo-preview': { provider: 'openai', model: 'gpt-4-turbo-preview' },
  'openai/gpt-4': { provider: 'openai', model: 'gpt-4' },
  'openai/gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo' },
  
  // Anthropic Models
  'anthropic/claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  'anthropic/claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
  'anthropic/claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  
  // Google Models
  'google/gemini-pro': { provider: 'google', model: 'gemini-pro' },
  'google/gemini-pro-vision': { provider: 'google', model: 'gemini-pro-vision' },
  'google/gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro' },
  'google/gemini-1.5-flash': { provider: 'google', model: 'gemini-1.5-flash' },
  
  // Groq Models
  'groq/mixtral-8x7b': { provider: 'groq', model: 'mixtral-8x7b-32768' },
  'groq/llama-3-70b': { provider: 'groq', model: 'llama3-70b-8192' },
  'groq/llama-3-8b': { provider: 'groq', model: 'llama3-8b-8192' },
  
  // DeepSeek Models
  'deepseek/deepseek-coder': { provider: 'deepseek', model: 'deepseek-coder' },
  'deepseek/deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat' },
  
  // ZhipuAI Models
  'zhipuai/glm-4': { provider: 'zhipuai', model: 'glm-4' },
  'zhipuai/glm-3-turbo': { provider: 'zhipuai', model: 'glm-3-turbo' },
  
  // Cohere Models
  'cohere/command-r-plus': { provider: 'cohere', model: 'command-r-plus' },
  'cohere/command-r': { provider: 'cohere', model: 'command-r' },
  
  // Mistral Models
  'mistral/mistral-large': { provider: 'mistral', model: 'mistral-large-latest' },
  'mistral/mistral-medium': { provider: 'mistral', model: 'mistral-medium-latest' },
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const requestData: QueryRequest = await req.json();
    const query = requestData.query || requestData.message || '';
    const sessionId = requestData.sessionId || `session-${Date.now()}`;
    const userId = requestData.userId || 'anonymous';
    const bypassCache = requestData.bypassCache !== false;
    
    // Normalize and validate model selection
    let selectedModel = requestData.model || 'openai/gpt-4-turbo-preview';
    if (!selectedModel.includes('/')) {
      selectedModel = `openai/${selectedModel}`;
    }
    
    const llmConfig = LLM_PROVIDERS[selectedModel] || LLM_PROVIDERS['openai/gpt-4-turbo-preview'];
    
    console.log('🎯 Processing query:', query);
    console.log('🤖 Using model:', selectedModel, '→', llmConfig);
    console.log('📚 Using tables: legal_articles (654 docs) + regime_urbanistico_consolidado');

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
            sources: { 
              legal_articles: true,
              regime_urbanistico: true,
              cached: true 
            },
            executionTime: 50,
            model: selectedModel
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Generate embedding for the query
    console.log('🔍 Generating embedding for query...');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured for embeddings');
    }
    
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

    // Step 3: Search in BOTH tables
    console.log('🔎 Searching in legal_articles and regime_urbanistico_consolidado...');
    
    // Search in legal_articles (legal documents with hierarchy)
    let legalDocuments = null;
    try {
      const rpcResult = await supabase.rpc('match_legal_articles', {
        query_embedding: queryEmbedding,
        match_threshold: 0.65,
        match_count: 10
      });
      legalDocuments = rpcResult.data;
    } catch (rpcError) {
      // Fallback to direct query if RPC doesn't exist
      console.log('⚠️ RPC not found, trying direct query...');
      const directResult = await supabase
        .from('legal_articles')
        .select('*')
        .or(`full_content.ilike.%${query}%,article_text.ilike.%${query}%`)
        .limit(10);
      legalDocuments = directResult.data;
    }
    
    // Search in regime_urbanistico_consolidado (structured urban planning data)
    const { data: regimeData } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('*')
      .or(`nome_bairro.ilike.%${query}%,nome_zona.ilike.%${query}%,descricao_zona.ilike.%${query}%`)
      .limit(5);

    // Combine all results
    let documents = [];
    let legalArticlesFound = 0;
    let hierarchyElementsFound = 0;
    let regimeRecordsFound = 0;
    
    if (legalDocuments && legalDocuments.length > 0) {
      console.log(`📚 Found ${legalDocuments.length} results from legal_articles`);
      legalDocuments.forEach((doc: any) => {
        if (doc.article_number && doc.article_number < 9000) {
          legalArticlesFound++;
        } else {
          hierarchyElementsFound++;
        }
      });
      documents = [...documents, ...legalDocuments];
    }
    
    if (regimeData && regimeData.length > 0) {
      console.log(`🏗️ Found ${regimeData.length} results from regime_urbanistico_consolidado`);
      regimeRecordsFound = regimeData.length;
      documents = [...documents, ...regimeData];
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({
          response: `Não encontrei informações específicas sobre "${query}" na base de conhecimento. Por favor, tente reformular sua pergunta ou consulte sobre:\n\n• Artigos específicos (ex: "Art. 75 da LUOS")\n• Bairros de Porto Alegre\n• Zonas urbanas (ZOT-01 a ZOT-09)\n• Parâmetros urbanísticos\n• Altura máxima permitida`,
          confidence: 0.3,
          sources: { legal_articles: 0, regime_urbanistico: 0 },
          executionTime: 1000,
          model: selectedModel
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Build context from found documents
    console.log(`📚 Building context from ${documents.length} documents`);
    
    const contextParts = [];
    
    // Add legal documents context
    const legalDocs = documents.filter((doc: any) => doc.article_number !== undefined);
    if (legalDocs.length > 0) {
      contextParts.push("=== DOCUMENTOS LEGAIS ===");
      legalDocs.forEach((doc: any) => {
        const docType = doc.document_type || 'PDPOA';
        const content = doc.full_content || doc.article_text || '';
        if (doc.article_number < 9000) {
          contextParts.push(`[${docType} - Art. ${doc.article_number}º]\n${content}`);
        } else {
          contextParts.push(`[${docType} - Hierarquia]\n${content}`);
        }
      });
    }
    
    // Add regime urbanístico context
    const regimeDocs = documents.filter((doc: any) => doc.nome_bairro !== undefined);
    if (regimeDocs.length > 0) {
      contextParts.push("\n=== REGIME URBANÍSTICO ===");
      regimeDocs.forEach((doc: any) => {
        contextParts.push(`
Bairro: ${doc.nome_bairro}
Zona: ${doc.nome_zona} (${doc.sigla_zona})
Altura Máxima: ${doc.altura_maxima}m
Altura na Base: ${doc.altura_na_base}m
Taxa de Ocupação: ${doc.taxa_de_ocupacao}%
Índice de Aproveitamento: ${doc.indice_de_aproveitamento}
Recuo Frontal: ${doc.recuo_frontal}m
Proteção Contra Enchentes: ${doc.protecao_contra_enchentes ? 'Sim' : 'Não'}`);
      });
    }
    
    const context = contextParts.join('\n\n');

    // Step 5: Generate response using selected LLM
    console.log(`🤖 Generating response with ${llmConfig.provider}/${llmConfig.model}...`);
    
    const systemPrompt = `Você é um assistente especializado no Plano Diretor de Porto Alegre (PDUS 2025) e legislação urbanística (LUOS).

VOCÊ TEM ACESSO A:
- 217 artigos do PDUS (Plano Diretor Urbano Sustentável)
- 123 artigos da LUOS (Lei de Uso e Ocupação do Solo)
- Toda hierarquia legal: Partes, Títulos, Capítulos, Seções
- Parágrafos, Incisos e Alíneas
- Regime Urbanístico Consolidado com dados de todos os bairros

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro
2. Cite artigos e dados específicos quando disponível
3. Use tabelas para apresentar dados de regime urbanístico
4. Formate a resposta de forma clara e estruturada
5. Se não encontrar informação específica, indique isso

CONTEXTO DISPONÍVEL:
${context}`;

    const startTime = Date.now();
    let response = '';
    
    // Call appropriate LLM based on provider
    switch (llmConfig.provider) {
      case 'openai':
        response = await callOpenAI(query, systemPrompt, llmConfig.model, openaiApiKey);
        break;
      
      case 'anthropic':
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
        response = await callAnthropic(query, systemPrompt, llmConfig.model, anthropicKey);
        break;
      
      case 'google':
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');
        response = await callGemini(query, systemPrompt, llmConfig.model, geminiKey);
        break;
      
      case 'groq':
        const groqKey = Deno.env.get('GROQ_API_KEY');
        if (!groqKey) throw new Error('GROQ_API_KEY not configured');
        response = await callGroq(query, systemPrompt, llmConfig.model, groqKey);
        break;
      
      case 'deepseek':
        const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
        if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not configured');
        response = await callDeepSeek(query, systemPrompt, llmConfig.model, deepseekKey);
        break;
      
      case 'zhipuai':
        const zhipuKey = Deno.env.get('ZHIPUAI_API_KEY');
        if (!zhipuKey) throw new Error('ZHIPUAI_API_KEY not configured');
        response = await callZhipuAI(query, systemPrompt, llmConfig.model, zhipuKey);
        break;
      
      default:
        // Default to OpenAI
        response = await callOpenAI(query, systemPrompt, 'gpt-4-turbo-preview', openaiApiKey);
    }
    
    const executionTime = Date.now() - startTime;
    console.log('✅ Response generated successfully in', executionTime, 'ms');

    // Cache the successful response
    try {
      await supabase.from('query_cache').upsert({
        query: query.toLowerCase(),
        response: response,
        confidence: 0.9,
        model: selectedModel,
        execution_time: executionTime,
        created_at: new Date().toISOString()
      });
    } catch (cacheErr) {
      console.error('Cache error:', cacheErr);
    }

    // Save to chat history
    try {
      await supabase.from('chat_history').insert({
        session_id: sessionId,
        user_id: userId,
        message: query,
        response: response,
        model: selectedModel,
        confidence: 0.9,
        execution_time: executionTime,
        created_at: new Date().toISOString()
      });
    } catch (histErr) {
      console.error('History error:', histErr);
    }

    return new Response(
      JSON.stringify({
        response: response,
        confidence: 0.9,
        sources: { 
          legal_articles: legalArticlesFound,
          hierarchy_elements: hierarchyElementsFound,
          regime_urbanistico: regimeRecordsFound,
          total: documents.length
        },
        executionTime: executionTime,
        model: selectedModel,
        provider: llmConfig.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agentic-rag:', error);
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

// LLM Provider Functions
async function callOpenAI(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API failed: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: systemPrompt }], role: 'user' },
        { parts: [{ text: query }], role: 'user' }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API failed: ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callDeepSeek(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callZhipuAI(query: string, systemPrompt: string, model: string, apiKey: string) {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ZhipuAI API failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}