import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// FEATURES AVANÇADAS DO V3 - INTEGRAÇÃO
// ============================================================

// TOKEN COUNTER - Gestão de contexto
class TokenCounter {
  static countTokens(text: string): number {
    if (!text) return 0;
    // Estimativa para português: 1 token ≈ 3.5 caracteres
    return Math.ceil(text.length / 3.5);
  }
  
  static limitContext(contexts: string[], maxTokens: number = 3000): string[] {
    const limitedContexts: string[] = [];
    let totalTokens = 0;
    
    for (const context of contexts) {
      const tokens = this.countTokens(context);
      if (totalTokens + tokens <= maxTokens) {
        limitedContexts.push(context);
        totalTokens += tokens;
      } else {
        // Truncar se ainda houver espaço
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) {
          const truncatedChars = Math.floor(remainingTokens * 3.5);
          limitedContexts.push(context.substring(0, truncatedChars) + "...");
        }
        break;
      }
    }
    
    console.log(`📊 Context window: ${totalTokens}/${maxTokens} tokens`);
    return limitedContexts;
  }
}

// QUALITY SCORER - Métricas de qualidade
class QualityScorer {
  static calculateScore(response: string, query: string, sources: any): number {
    let score = 0.5; // Base score
    
    // Verifica se tem conteúdo substancial
    if (response.length > 100) score += 0.1;
    if (response.length > 500) score += 0.1;
    
    // Verifica se tem fontes
    if (sources?.legal_articles > 0) score += 0.15;
    if (sources?.regime_urbanistico > 0) score += 0.15;
    
    // Verifica formatação
    if (response.includes('Art.') || response.includes('ZOT')) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

// FALLBACK MANAGER - Estratégias de recuperação de falhas
class FallbackManager {
  private static fallbackStrategies = [
    { name: 'retry_with_simpler_query', maxAttempts: 2 },
    { name: 'use_cached_similar', maxAttempts: 1 },
    { name: 'use_default_model', maxAttempts: 1 }
  ];
  
  static async handleError(
    error: any,
    query: string,
    supabase: any,
    attemptNumber: number = 1
  ): Promise<any> {
    console.error(`❌ Error attempt ${attemptNumber}:`, error.message);
    
    // Strategy 1: Retry with simpler query
    if (attemptNumber <= 2 && error.message?.includes('rate_limit')) {
      console.log('🔄 Applying fallback: Waiting and retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000 * attemptNumber));
      return { retry: true, strategy: 'wait_and_retry' };
    }
    
    // Strategy 2: Use cached similar query
    if (attemptNumber <= 3) {
      console.log('🔄 Applying fallback: Searching for similar cached queries...');
      const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
      
      for (const keyword of keywords) {
        const { data: cached } = await supabase
          .from('query_cache')
          .select('response, confidence')
          .ilike('query', `%${keyword}%`)
          .limit(1)
          .single();
        
        if (cached?.response) {
          console.log(`✅ Found similar cached response for keyword: ${keyword}`);
          return {
            response: cached.response,
            confidence: (cached.confidence || 0.7) * 0.8, // Reduce confidence
            fallback: true,
            strategy: 'similar_cache'
          };
        }
      }
    }
    
    // Strategy 3: Return informative error message
    console.log('🔄 Applying fallback: Returning user-friendly error message');
    return {
      response: `Desculpe, encontrei um problema ao processar sua pergunta sobre "${query.substring(0, 50)}...". 
      
Por favor, tente:
- Reformular sua pergunta de forma mais específica
- Dividir perguntas complexas em partes menores
- Verificar se está perguntando sobre PDUS ou LUOS especificamente

Se o problema persistir, o sistema pode estar temporariamente sobrecarregado. Tente novamente em alguns instantes.`,
      confidence: 0,
      fallback: true,
      strategy: 'error_message',
      error: error.message
    };
  }
  
  static validateResponse(response: string): boolean {
    // Check if response is valid and not an error
    if (!response || response.length < 20) return false;
    if (response.includes('Error:') || response.includes('undefined')) return false;
    if (response.includes('<!DOCTYPE') || response.includes('<html>')) return false;
    return true;
  }
}

// RESULT RERANKER - Reordenação de resultados por relevância
class ResultReranker {
  static rerank(results: any[], query: string, maxResults: number = 5): any[] {
    if (!results || results.length === 0) return [];
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    // Score each result
    const scoredResults = results.map(result => {
      let score = result.similarity || 0;
      
      // Check if this is regime urbanístico data (has Bairro or Zona fields)
      const isRegimeData = result.Bairro !== undefined || result.Zona !== undefined;
      
      if (isRegimeData) {
        // Special handling for regime urbanístico data
        const bairro = (result.Bairro || '').toLowerCase();
        const zona = (result.Zona || '').toLowerCase();
        
        // Check for neighborhood match
        if (bairro) {
          // Exact neighborhood match
          if (queryLower.includes('petrópolis') && bairro.includes('petró')) score += 0.8;
          else if (queryLower.includes('petropolis') && bairro.includes('petró')) score += 0.8;
          else if (queryLower.includes(bairro)) score += 0.7;
          
          // Partial match
          queryWords.forEach(word => {
            if (bairro.includes(word)) score += 0.2;
          });
        }
        
        // Zone match
        if (zona) {
          const zoneMatch = query.match(/ZOT\s*(\d+)/i);
          if (zoneMatch && zona.includes(zoneMatch[1])) {
            score += 0.5;
          }
          if (queryLower.includes(zona.toLowerCase())) score += 0.3;
        }
        
        // Boost if query mentions altura, coeficiente, etc
        if (queryLower.includes('altura') || queryLower.includes('coef')) score += 0.1;
        
      } else {
        // Regular document processing (legal articles, etc)
        const content = (result.content || result.text || result.full_content || result.article_text || '').toLowerCase();
        const title = (result.title || '').toLowerCase();
        
        // Exact query match
        if (content.includes(queryLower)) score += 0.3;
        if (title.includes(queryLower)) score += 0.4;
        
        // Word matches
        queryWords.forEach(word => {
          if (content.includes(word)) score += 0.05;
          if (title.includes(word)) score += 0.1;
        });
        
        // Article number match
        const articleMatch = query.match(/art(?:igo)?\.?\s*(\d+)/i);
        if (articleMatch) {
          const articleNum = articleMatch[1];
          if (result.article_number === articleNum || 
              content.includes(`artigo ${articleNum}`) ||
              content.includes(`art. ${articleNum}`)) {
            score += 0.5;
          }
        }
        
        // Document type relevance
        if (query.includes('PDUS') && result.document_type === 'PDUS') score += 0.2;
        if (query.includes('LUOS') && result.document_type === 'LUOS') score += 0.2;
      }
      
      return { ...result, finalScore: score };
    });
    
    // Sort by score and return top results
    scoredResults.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log(`🎯 Reranked ${results.length} results, returning top ${maxResults}`);
    console.log(`📊 Score range: ${scoredResults[0]?.finalScore?.toFixed(2)} - ${scoredResults[Math.min(maxResults-1, scoredResults.length-1)]?.finalScore?.toFixed(2)}`);
    
    return scoredResults.slice(0, maxResults);
  }
  
  static combineResults(legalResults: any[], regimeResults: any[], hierarchyResults: any[]): any[] {
    const combined = [];
    
    // Add legal results with type tag
    if (legalResults?.length > 0) {
      combined.push(...legalResults.map(r => ({ ...r, resultType: 'legal' })));
    }
    
    // Add regime results with type tag
    if (regimeResults?.length > 0) {
      combined.push(...regimeResults.map(r => ({ ...r, resultType: 'regime' })));
    }
    
    // Add hierarchy results with type tag
    if (hierarchyResults?.length > 0) {
      combined.push(...hierarchyResults.map(r => ({ ...r, resultType: 'hierarchy' })));
    }
    
    // Remove duplicates based on content similarity
    const unique = [];
    const seen = new Set();
    
    for (const result of combined) {
      // Create unique key based on available fields
      let key = '';
      if (result.resultType === 'regime') {
        // For regime data, use Bairro and Zona as unique key
        key = `regime_${result.Bairro || ''}_${result.Zona || ''}`;
      } else {
        // For legal documents, use article number and content
        const contentPreview = (result.content || result.full_content || result.article_text || '').substring(0, 100);
        key = `${result.article_number || ''}${result.title || ''}${contentPreview}`;
      }
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }
    
    return unique;
  }
}

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

// Helper functions for Roman numeral conversion
function romanToArabic(roman: string): number {
  if (!roman || typeof roman !== 'string') return 0;
  const romanNumerals: { [key: string]: number } = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
  };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanNumerals[roman[i]];
    const next = romanNumerals[roman[i + 1]];
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  return result;
}

function arabicToRoman(num: number): string {
  if (!num || num <= 0) return '';
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }
  return result;
}

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
    
    // Get conversation history for context
    let previousContext = null;
    const { data: conversationHistory } = await supabase
      .from('chat_memory')
      .select('query, response')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    // Detect which law was discussed previously
    let contextualDocType = null;
    if (conversationHistory && conversationHistory.length > 0) {
      const lastMessages = conversationHistory.map(h => (h.query + ' ' + h.response).toLowerCase());
      if (lastMessages.some(msg => msg.includes('pdus') || msg.includes('plano diretor'))) {
        contextualDocType = 'PDUS';
        console.log('📝 Previous context detected: PDUS');
      } else if (lastMessages.some(msg => msg.includes('luos') || msg.includes('lei de uso'))) {
        contextualDocType = 'LUOS';
        console.log('📝 Previous context detected: LUOS');
      }
    }
    
    // Normalize and validate model selection with proper provider detection
    let selectedModel = requestData.model || 'openai/gpt-4-turbo-preview';
    
    // Fix Multi-LLM routing - detect provider based on model name
    if (!selectedModel.includes('/')) {
      // Intelligent provider detection based on model patterns
      let provider = 'openai'; // default fallback
      
      const modelLower = selectedModel.toLowerCase();
      
      // IMPORTANT: Check more specific patterns first
      
      // Anthropic models (check first as some contain generic words)
      if (modelLower.includes('claude') || modelLower.includes('opus') || 
          modelLower.includes('sonnet') || modelLower.includes('haiku')) {
        provider = 'anthropic';
      }
      // Google models
      else if (modelLower.includes('gemini') || modelLower.includes('bison') || 
               modelLower.includes('palm')) {
        provider = 'google';
      }
      // Groq models (mixtral, llama, etc)
      else if (modelLower.includes('mixtral') || modelLower.includes('llama')) {
        provider = 'groq';
      }
      // Mistral models
      else if (modelLower.includes('mistral') && !modelLower.includes('mixtral')) {
        provider = 'mistral';
      }
      // DeepSeek models
      else if (modelLower.includes('deepseek')) {
        provider = 'deepseek';
      }
      // ZhipuAI models
      else if (modelLower.includes('glm') || modelLower.includes('chatglm')) {
        provider = 'zhipuai';
      }
      // Cohere models
      else if (modelLower.includes('command')) {
        provider = 'cohere';
      }
      // OpenAI models (check last as it's the default)
      else if (modelLower.startsWith('gpt') || modelLower.includes('turbo') || 
               modelLower.includes('davinci') || modelLower.includes('curie')) {
        provider = 'openai';
      }
      
      selectedModel = `${provider}/${selectedModel}`;
      console.log(`🔧 Auto-detected provider: ${provider} for model: ${selectedModel}`);
    }
    
    const llmConfig = LLM_PROVIDERS[selectedModel] || LLM_PROVIDERS['openai/gpt-4-turbo-preview'];
    
    // Validate API key availability for selected provider
    const apiKeyMap = {
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'google': 'GEMINI_API_KEY',
      'groq': 'GROQ_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'zhipuai': 'ZHIPUAI_API_KEY'
    };
    
    const requiredKey = apiKeyMap[llmConfig.provider];
    const hasKey = requiredKey && Deno.env.get(requiredKey);
    
    if (!hasKey && llmConfig.provider !== 'openai') {
      console.warn(`⚠️ ${requiredKey} not configured, falling back to OpenAI`);
      selectedModel = 'openai/gpt-4-turbo-preview';
      llmConfig.provider = 'openai';
      llmConfig.model = 'gpt-4-turbo-preview';
    }
    
    console.log('🎯 Processing query:', query);
    console.log('🤖 Using model:', selectedModel, '→', llmConfig);
    console.log('🔑 API Key Status:', hasKey ? '✅ Available' : '⚠️ Using fallback');
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

    // Step 3: Search in BOTH tables + hierarchy
    console.log('🔎 Searching in legal_articles, hierarchy and regime_urbanistico_consolidado...');
    
    // Enhanced pattern matching for articles and hierarchical elements
    const articleMatch = query.match(/art(?:igo)?\.?\s*(\d+)\s*(?:da\s+|do\s+)?(LUOS|PDUS|plano diretor|lei de uso)?/i);
    const titleMatch = query.match(/título\s+([IVX]+|\d+|[A-Z]+)\s*(?:da\s+|do\s+)?(LUOS|PDUS)?/i);
    const chapterMatch = query.match(/capítulo\s+([IVX]+|\d+)\s*(?:da\s+|do\s+)?(LUOS|PDUS)?/i);
    const sectionMatch = query.match(/seção\s+([IVX]+|\d+)\s*(?:da\s+|do\s+)?(LUOS|PDUS)?/i);
    
    let legalDocuments = null;
    let hierarchyContext = null;
    
    // Handle specific article requests
    if (articleMatch) {
      const articleNumber = parseInt(articleMatch[1]);
      let specifiedDocType = null;
      
      // Check if user specified which law
      if (articleMatch[2]) {
        if (articleMatch[2].toUpperCase() === 'PDUS' || articleMatch[2].toLowerCase().includes('plano')) {
          specifiedDocType = 'PDUS';
        } else if (articleMatch[2].toUpperCase() === 'LUOS' || articleMatch[2].toLowerCase().includes('lei de uso')) {
          specifiedDocType = 'LUOS';
        }
      }
      
      // Use contextual doc type if not specified
      const docType = specifiedDocType || contextualDocType;
      
      if (docType) {
        // Search in specific law
        console.log(`📍 Searching for article ${articleNumber} in ${docType} (based on ${specifiedDocType ? 'user specification' : 'context'})`);
        
        const { data: specificArticle } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', docType)
          .eq('article_number', articleNumber)
          .single();
        
        if (specificArticle) {
          legalDocuments = [specificArticle];
        }
      } else {
        // No context - search in ALL laws
        console.log(`📍 No context specified - searching for article ${articleNumber} in ALL laws`);
        
        const { data: articlesFromAllLaws } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('article_number', articleNumber)
          .in('document_type', ['PDUS', 'LUOS', 'COE']); // Can add more laws here
        
        if (articlesFromAllLaws && articlesFromAllLaws.length > 0) {
          legalDocuments = articlesFromAllLaws;
          console.log(`📚 Found article ${articleNumber} in ${articlesFromAllLaws.length} law(s)`);
        }
      }
      
      // Get related articles if we found something
      if (legalDocuments && legalDocuments.length > 0) {
        const mainDoc = legalDocuments[0];
        
        // Get hierarchy context
        try {
          const { data: hierarchyData } = await supabase
            .rpc('get_complete_hierarchy', { 
              doc_type: mainDoc.document_type, 
              art_num: articleNumber 
            });
          
          if (hierarchyData) {
            hierarchyContext = hierarchyData;
            console.log(`📊 Hierarchy context: ${hierarchyContext}`);
          }
        } catch (e) {
          console.log('⚠️ Could not get hierarchy context:', e.message);
        }
        
        // Get related articles for context
        const { data: relatedArticles } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', mainDoc.document_type)
          .gte('article_number', articleNumber - 1)
          .lte('article_number', articleNumber + 1)
          .neq('article_number', articleNumber)
          .limit(4);
        
        if (relatedArticles) {
          legalDocuments = [...legalDocuments, ...relatedArticles];
        }
      }
    }
    
    // Handle hierarchical elements (Títulos, Capítulos, Seções)
    if (titleMatch || chapterMatch || sectionMatch) {
      const hierarchyType = titleMatch ? 'titulo' : chapterMatch ? 'capitulo' : 'secao';
      const hierarchyNumber = titleMatch?.[1] || chapterMatch?.[1] || sectionMatch?.[1];
      const docType = (titleMatch?.[2] || chapterMatch?.[2] || sectionMatch?.[2] || 'LUOS').toUpperCase();
      
      console.log(`📚 Searching for ${hierarchyType} ${hierarchyNumber} in ${docType}`);
      
      // Search in legal_hierarchy table
      const { data: hierarchyData } = await supabase
        .from('legal_hierarchy')
        .select('*')
        .eq('document_type', docType)
        .eq('hierarchy_type', hierarchyType)
        .eq('hierarchy_number', hierarchyNumber)
        .single();
      
      if (hierarchyData) {
        // Get all articles in this hierarchy element
        const { data: articlesInHierarchy } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', docType)
          .gte('article_number', hierarchyData.article_start)
          .lte('article_number', hierarchyData.article_end)
          .limit(10);
        
        if (articlesInHierarchy) {
          legalDocuments = articlesInHierarchy;
          hierarchyContext = `${hierarchyType.toUpperCase()} ${hierarchyNumber} - ${hierarchyData.hierarchy_name}`;
        }
      }
    }
    
    // Old hierarchical search code - removed
    // The logic above already handles hierarchical searches properly
    
    // If no specific element found, use enhanced search
    if (!legalDocuments || legalDocuments.length === 0) {
      // First try text search for better hierarchical element matching
      const keyTerms = query.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(' ')
        .filter(term => term.length > 3);
      
      // Build search conditions
      const searchConditions = [];
      if (query.toLowerCase().includes('título')) {
        searchConditions.push(`full_content.ilike.%título%`);
      }
      if (query.toLowerCase().includes('capítulo')) {
        searchConditions.push(`full_content.ilike.%capítulo%`);
      }
      if (query.toLowerCase().includes('seção') || query.toLowerCase().includes('secao')) {
        searchConditions.push(`full_content.ilike.%seção%`, `full_content.ilike.%secao%`);
      }
      if (query.toLowerCase().includes('disposições')) {
        searchConditions.push(`full_content.ilike.%disposições%`);
      }
      
      // Add general search terms
      keyTerms.forEach(term => {
        if (term.length > 4) {
          searchConditions.push(`full_content.ilike.%${term}%`);
        }
      });
      
      if (searchConditions.length > 0) {
        const { data: textSearchResults } = await supabase
          .from('legal_articles')
          .select('*')
          .or(searchConditions.join(','))
          .limit(15);
        
        if (textSearchResults && textSearchResults.length > 0) {
          legalDocuments = textSearchResults;
          console.log(`📝 Text search found ${textSearchResults.length} results`);
        }
      }
      
      // If still no results, try vector search
      if (!legalDocuments || legalDocuments.length === 0) {
        try {
          const rpcResult = await supabase.rpc('match_legal_articles', {
            query_embedding: queryEmbedding,
            match_threshold: 0.60,  // Lower threshold for better recall
            match_count: 15
          });
          legalDocuments = rpcResult.data;
          console.log(`🔍 Vector search found ${rpcResult.data?.length || 0} results`);
        } catch (rpcError) {
          console.log('⚠️ RPC not found, trying fallback direct query...');
          const directResult = await supabase
            .from('legal_articles')
            .select('*')
            .or(`full_content.ilike.%${query}%,article_text.ilike.%${query}%`)
            .limit(15);
          legalDocuments = directResult.data;
        }
      }
    }
    
    // Search in regime_urbanistico_consolidado (structured urban planning data)
    console.log('🏗️ Searching regime urbanístico for:', query);
    
    // Enhanced search for ZOT patterns and neighborhood names
    let regimeSearchConditions = [];
    
    // Direct search
    regimeSearchConditions.push(`"Bairro".ilike.%${query}%`);
    regimeSearchConditions.push(`"Zona".ilike.%${query}%`);
    
    // ZOT-specific search patterns
    const zotMatch = query.match(/zot\s*(\d+)/i);
    if (zotMatch) {
      const zotNumber = zotMatch[1].padStart(2, '0'); // Convert "2" to "02"
      regimeSearchConditions.push(`"Zona".ilike.%ZOT ${zotNumber}%`);
      regimeSearchConditions.push(`"Zona".ilike.%ZOT${zotNumber}%`);
      console.log(`🎯 Enhanced ZOT search for: ZOT ${zotNumber}`);
    }
    
    // Extract potential neighborhood names from query
    const neighborhoodPatterns = [
      /bairro\s+([^,\s]+(?:\s+[^,\s]+)*)/gi,  // "bairro XYZ"
      /no\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]+)/gi, // "no Petrópolis"
      /(centro|petrópolis|jardim\s+são\s+pedro|restinga|agronomia|menino\s+deus|cidade\s+baixa|auxiliadora|moinhos\s+de\s+vento)/gi // Common neighborhoods
    ];
    
    for (const pattern of neighborhoodPatterns) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const neighborhood = match[1] || match[0];
        if (neighborhood && neighborhood.length > 3) {
          // Add various normalizations
          const cleanNeighborhood = neighborhood.trim().toUpperCase()
            .replace(/PETROPOLIS/g, 'PETRÓPOLIS')
            .replace(/SAO/g, 'SÃO');
          
          regimeSearchConditions.push(`"Bairro".ilike.%${cleanNeighborhood}%`);
          console.log(`🎯 Extracted neighborhood search: ${cleanNeighborhood}`);
          
          // Also try without accents
          const withoutAccents = cleanNeighborhood
            .replace(/PETRÓPOLIS/g, 'PETROPOLIS')
            .replace(/SÃO/g, 'SAO');
          
          if (withoutAccents !== cleanNeighborhood) {
            regimeSearchConditions.push(`"Bairro".ilike.%${withoutAccents}%`);
            console.log(`🎯 Alternative search: ${withoutAccents}`);
          }
        }
      }
    }
    
    const { data: regimeData } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('*')
      .or(regimeSearchConditions.join(','))
      .limit(15);
    
    console.log(`🏗️ Found ${regimeData?.length || 0} regime urbanístico results`);

    // Combine all results using ResultReranker
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
    }
    
    if (regimeData && regimeData.length > 0) {
      console.log(`🏗️ Found ${regimeData.length} results from regime_urbanistico_consolidado`);
      regimeRecordsFound = regimeData.length;
    }
    
    // V3 Feature: Use ResultReranker to combine and rerank results
    const combinedResults = ResultReranker.combineResults(
      legalDocuments || [],
      regimeData || [],
      [] // hierarchy results if available
    );
    
    // Rerank results based on query relevance
    documents = ResultReranker.rerank(combinedResults, query, 10);
    console.log(`🎯 Reranked results: ${documents.length} most relevant from ${combinedResults.length} total`);

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
    
    // V3 Feature: Token counting for context management
    const contextParts = [];
    const MAX_CONTEXT_TOKENS = 3000;
    
    // Add hierarchy context if available
    if (hierarchyContext) {
      contextParts.push("=== LOCALIZAÇÃO HIERÁRQUICA ===");
      contextParts.push(hierarchyContext);
      contextParts.push("");
    }
    
    // IMPORTANT: Add regime urbanístico context FIRST (before legal docs) to avoid being cut by token limit
    const regimeDocs = documents.filter((doc: any) => doc.Bairro !== undefined);
    if (regimeDocs.length > 0) {
      contextParts.push("=== REGIME URBANÍSTICO ===");
      regimeDocs.forEach((doc: any) => {
        contextParts.push(`
Bairro: ${doc.Bairro}
Zona: ${doc.Zona}
Altura Máxima: ${doc.Altura_Maxima___Edificacao_Isolada || 'N/A'}m
Coeficiente Aproveitamento Básico: ${doc.Coeficiente_de_Aproveitamento___Basico || 'N/A'}
Coeficiente Aproveitamento Máximo: ${doc.Coeficiente_de_Aproveitamento___Maximo || 'N/A'}
Área Mínima do Lote: ${doc.Área_Minima_do_Lote || 'N/A'}m²
Taxa de Permeabilidade: ${doc['Taxa_de_Permeabilidade_ate_1,500_m2'] || 'N/A'}%
Afastamento Frontal: ${doc.Afastamentos___Frente || 'N/A'}
Afastamento Lateral: ${doc.Afastamentos___Laterais || 'N/A'}
Afastamento Fundos: ${doc.Afastamentos___Fundos || 'N/A'}`);
      });
      contextParts.push("");
    }
    
    // Add legal documents context
    const legalDocs = documents.filter((doc: any) => doc.article_number !== undefined);
    if (legalDocs.length > 0) {
      contextParts.push("=== DOCUMENTOS LEGAIS ===");
      legalDocs.forEach((doc: any) => {
        const docType = doc.document_type || 'PDPOA';
        const content = doc.full_content || doc.article_text || '';
        
        if (doc.article_number < 9000) {
          // Regular articles
          contextParts.push(`[${docType} - Art. ${doc.article_number}º]\n${content}`);
        } else {
          // Hierarchical elements (Títulos, Capítulos, Seções)
          // Check what type of element it is
          if (content.includes('TÍTULO')) {
            const titleMatch = content.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
            if (titleMatch) {
              contextParts.push(`[${docType} - ${titleMatch[0]}]\n${content}`);
            } else {
              contextParts.push(`[${docType} - Elemento Hierárquico]\n${content}`);
            }
          } else if (content.includes('CAPÍTULO')) {
            const chapterMatch = content.match(/CAPÍTULO\s+([IVX]+|[0-9]+)/);
            if (chapterMatch) {
              contextParts.push(`[${docType} - ${chapterMatch[0]}]\n${content}`);
            } else {
              contextParts.push(`[${docType} - Elemento Hierárquico]\n${content}`);
            }
          } else if (content.includes('SEÇÃO') || content.includes('SECAO')) {
            const sectionMatch = content.match(/SE[CÇ]ÃO\s+([IVX]+|[0-9]+)/);
            if (sectionMatch) {
              contextParts.push(`[${docType} - ${sectionMatch[0]}]\n${content}`);
            } else {
              contextParts.push(`[${docType} - Elemento Hierárquico]\n${content}`);
            }
          } else {
            // Other hierarchical elements (parts, subsections, etc.)
            contextParts.push(`[${docType} - Elemento Hierárquico]\n${content}`);
          }
        }
      });
    }
    
    // Regime urbanístico already added above (before legal docs to avoid token limit truncation)
    
    // V3 Feature: Apply token limit to context
    const limitedContextParts = TokenCounter.limitContext(contextParts, MAX_CONTEXT_TOKENS);
    const context = limitedContextParts.join('\n\n');
    
    console.log(`📏 Context size: ${contextParts.length} parts → ${limitedContextParts.length} after limiting`);

    // Step 5: Generate response using selected LLM
    console.log(`🤖 Generating response with ${llmConfig.provider}/${llmConfig.model}...`);
    
    const systemPrompt = `Você é um assistente especializado em legislação urbanística de Porto Alegre, incluindo:
- PDUS (Plano Diretor Urbano Sustentável 2025)
- LUOS (Lei de Uso e Ocupação do Solo)
- COE (Código de Edificações) 
- Outras leis e normativas municipais

IMPORTANTE - MÚLTIPLAS LEIS:
${legalDocuments && legalDocuments.length > 1 && legalDocuments.some(d => d.document_type !== legalDocuments[0].document_type) ? 
`⚠️ O contexto contém informações de MÚLTIPLAS LEIS. Apresente TODAS as versões encontradas, indicando claramente de qual lei é cada uma.` : 
`📌 Contexto principal: ${legalDocuments?.[0]?.document_type || 'Não especificado'}`}

REGRAS FUNDAMENTAIS:
1. Use EXCLUSIVAMENTE o contexto fornecido abaixo para responder
2. Quando um artigo existir em múltiplas leis, APRESENTE TODAS AS VERSÕES, indicando de qual lei é cada uma
3. Se o usuário não especificar qual lei, e houver contexto de conversa anterior, use o contexto${contextualDocType ? ` (conversa anterior sobre: ${contextualDocType})` : ''}
4. Se não houver contexto e a pergunta for ambígua, INFORME sobre a existência de múltiplas leis

INSTRUÇÕES ESPECÍFICAS:
- Para artigos: Se existir em múltiplas leis, apresente assim:
  • PDUS - Art. Xº: [conteúdo]
  • LUOS - Art. Xº: [conteúdo]
- Sempre identifique de qual lei vem cada informação
- Mantenha formatação: "Art. Xº", "TÍTULO I", etc.
- Se o usuário perguntar "e o artigo X" após falar de uma lei específica, continue com a mesma lei

BASE DE CONHECIMENTO DISPONÍVEL:
- PDUS: 217 artigos (Plano Diretor)
- LUOS: 655 artigos (Lei de Uso e Ocupação do Solo)
- Regime Urbanístico: Parâmetros de construção por zona

CONTEXTO FORNECIDO:
${context}

RESPONDA com base APENAS no contexto acima. Se encontrar o mesmo artigo em múltiplas leis, apresente todas as versões.`;

    const startTime = Date.now();
    let response = '';
    
    // Enhanced synthesizer temporarily disabled for testing
    // TODO: Re-enable after fixing response issues
    /*
    try {
      console.log('🚀 Trying enhanced response synthesizer...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && serviceKey) {
        const enhancedResponse = await fetch(`${supabaseUrl}/functions/v1/response-synthesizer-enhanced`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            originalQuery: query,
            agentResults: documents.map((doc: any) => ({
              agent: doc.document_type ? 'legal' : 'regime',
              data: doc,
              metadata: {
                source: doc.document_type || 'regime_urbanistico',
                confidence: doc.similarity || 0.8
              }
            })),
            metadata: {
              intent: articleMatch ? 'search_article' : 'general_search',
              extraction_confidence: 0.8
            }
          }),
        });
        
        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          if (enhancedData.response) {
            response = enhancedData.response;
            console.log('✅ Enhanced synthesizer response received');
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Enhanced synthesizer unavailable, using standard LLM:', error.message);
    }
    */
    
    // If no enhanced response, use standard LLM with FallbackManager
    if (!response) {
      let attemptNumber = 1;
      const maxAttempts = 3;
      
      // V3 Feature: FallbackManager integration for error recovery
      while (attemptNumber <= maxAttempts && !response) {
        try {
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
          
          // Validate response
          if (!FallbackManager.validateResponse(response)) {
            throw new Error('Invalid or empty response from LLM');
          }
          console.log(`✅ Valid response generated on attempt ${attemptNumber}`);
          
        } catch (error) {
          console.error(`❌ LLM call failed on attempt ${attemptNumber}:`, error.message);
          
          // Use FallbackManager to handle the error
          const fallbackResult = await FallbackManager.handleError(
            error,
            query,
            supabase,
            attemptNumber
          );
          
          if (fallbackResult.retry) {
            attemptNumber++;
            console.log(`🔄 Retrying (attempt ${attemptNumber}/${maxAttempts})...`);
            continue;
          } else if (fallbackResult.response) {
            // Use fallback response
            response = fallbackResult.response;
            console.log(`✅ Using fallback response (strategy: ${fallbackResult.strategy})`);
            break;
          } else if (attemptNumber >= maxAttempts) {
            // Final fallback
            response = fallbackResult.response || `Desculpe, não consegui processar sua pergunta após ${maxAttempts} tentativas. Por favor, tente novamente mais tarde.`;
            break;
          }
          attemptNumber++;
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    console.log('✅ Response generated successfully in', executionTime, 'ms');
    
    // V3 Feature: Calculate quality score
    const sources = {
      legal_articles: legalArticlesFound,
      hierarchy_elements: hierarchyElementsFound,
      regime_urbanistico: regimeRecordsFound
    };
    const qualityScore = QualityScorer.calculateScore(response, query, sources);
    const finalConfidence = Math.max(0.9, qualityScore); // Minimum 0.9 for backward compatibility
    
    console.log(`📊 Quality Score: ${(qualityScore * 100).toFixed(1)}% | Confidence: ${(finalConfidence * 100).toFixed(1)}%`);

    // Cache the successful response
    try {
      await supabase.from('query_cache').upsert({
        query: query.toLowerCase(),
        response: response,
        confidence: finalConfidence,
        model: selectedModel,
        execution_time: executionTime,
        created_at: new Date().toISOString()
      });
    } catch (cacheErr) {
      console.error('Cache error:', cacheErr);
    }

    // Save to chat history and memory for context
    try {
      // Save to chat_history
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
      
      // Save to chat_memory for context tracking
      await supabase.from('chat_memory').insert({
        session_id: sessionId,
        user_id: userId,
        query: query,
        response: response,
        context: {
          detected_law: legalDocuments?.[0]?.document_type || null,
          article_numbers: legalDocuments?.map(d => d.article_number).filter(n => n) || [],
          multiple_laws: legalDocuments && legalDocuments.length > 1 && 
                        legalDocuments.some(d => d.document_type !== legalDocuments[0].document_type)
        },
        confidence_score: 0.9,
        created_at: new Date().toISOString()
      });
    } catch (histErr) {
      console.error('History/Memory error:', histErr);
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