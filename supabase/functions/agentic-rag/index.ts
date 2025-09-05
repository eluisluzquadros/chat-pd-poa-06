import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// MIGRAÇÃO COMPLETA PARA KNOWLEDGEBASE - SISTEMA UNIFICADO
// ============================================================

// SECURITY GUARDRAILS - Proteção contra ataques
class SecurityGuardrails {
  private static readonly DANGEROUS_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /forget\s+everything/i,
    /act\s+as\s+(?:a\s+)?(?:developer|admin|root|system)/i,
    /you\s+are\s+now\s+(?:a\s+)?(?:developer|admin|root|system)/i,
    /switch\s+to\s+(?:developer|admin|root|system)\s+mode/i,
    /your\s+instructions\s+are\s+now/i,
    /new\s+instructions?\s*:/i,
    /override\s+(?:previous|original)\s+instructions/i,
    /system\s+prompt\s*:/i,
    /assistant\s*:\s*i\s+will/i,
    /roleplay\s+as/i,
    /pretend\s+(?:you\s+are|to\s+be)/i,
    /<\s*script[\s\S]*?>/i,
    /javascript\s*:/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /localStorage/i,
    /sessionStorage/i,
  ];

  private static readonly MAX_QUERY_LENGTH = 2000;
  private static readonly SUSPICIOUS_CHARS = /<|>|{|}|\[|\]|`|;|eval|script|javascript|vbscript/gi;

  static validateInput(query: string): { isValid: boolean; reason?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, reason: 'Query vazia' };
    }

    if (query.length > this.MAX_QUERY_LENGTH) {
      return { isValid: false, reason: 'Query muito longa - possível ataque DoS' };
    }

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(query)) {
        console.warn(`🚨 Blocked dangerous pattern: ${pattern.source}`);
        return { isValid: false, reason: 'Padrão de prompt injection detectado' };
      }
    }

    const suspiciousMatches = query.match(this.SUSPICIOUS_CHARS);
    if (suspiciousMatches && suspiciousMatches.length > 5) {
      return { isValid: false, reason: 'Muitos caracteres suspeitos detectados' };
    }

    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /execute\s*\(/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(query)) {
        console.warn(`🚨 Blocked SQL injection pattern: ${pattern.source}`);
        return { isValid: false, reason: 'Padrão de SQL injection detectado' };
      }
    }

    return { isValid: true };
  }

  static sanitizeInput(query: string): string {
    return query
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}

// STANDARD MESSAGES
const STANDARD_ERROR_MESSAGE = "Desculpe mas no momento estamos enfrentando instabilidades nos servidores e nosso time já está trabalhando para resolver a situação. Considere envir sua pergunta pelos canais oficiais. Você pode acessar os dados do regime urbanístico por bairros e zonas usando nosso mapa interativo.";

const STANDARD_FOOTER = `

📍 Explore mais:
Mapa com Regras Construtivas:https://bit.ly/3ILdXRA ↗
Contribua com sugestões:https://bit.ly/4oefZKm ↗
💬 Dúvidas? planodiretor@portoalegre.rs.gov.br

💬 Sua pergunta é importante! Considere enviá-la pelos canais oficiais para contribuir com o aperfeiçoamento do plano.`;

function addStandardFooter(response: string): string {
  if (!response) return STANDARD_FOOTER.trim();
  
  if (response.includes('📍 Explore mais:')) {
    return response;
  }
  
  return response.trim() + STANDARD_FOOTER;
}

// TOKEN COUNTER
class TokenCounter {
  static countTokens(text: string): number {
    if (!text) return 0;
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

// QUALITY SCORER
class QualityScorer {
  static calculateScore(response: string, query: string, sources: any): number {
    let score = 0.5;
    
    if (response.length > 100) score += 0.1;
    if (response.length > 500) score += 0.1;
    
    if (sources?.knowledgebase > 0) score += 0.15;
    if (sources?.regime_urbanistico > 0) score += 0.15;
    if (sources?.legal_articles > 0) score += 0.15;
    
    if (response.includes('Art.') || response.includes('ZOT')) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

// FALLBACK MANAGER
class FallbackManager {
  static async handleError(
    error: any,
    query: string,
    supabase: any,
    attemptNumber: number = 1
  ): Promise<any> {
    console.error(`❌ Error attempt ${attemptNumber}:`, error.message);
    
    if (attemptNumber <= 2 && error.message?.includes('rate_limit')) {
      console.log('🔄 Applying fallback: Waiting and retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000 * attemptNumber));
      return { retry: true, strategy: 'wait_and_retry' };
    }
    
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
            response: addStandardFooter(cached.response),
            confidence: (cached.confidence || 0.7) * 0.8,
            fallback: true,
            strategy: 'similar_cache'
          };
        }
      }
    }
    
    console.log('🔄 Applying fallback: Returning standard error message');
    return {
      response: addStandardFooter(STANDARD_ERROR_MESSAGE),
      confidence: 0,
      fallback: true,
      strategy: 'error_message',
      error: error.message
    };
  }
  
  static validateResponse(response: string): boolean {
    if (!response || response.length < 20) return false;
    if (response.includes('Error:') || response.includes('undefined')) return false;
    if (response.includes('<!DOCTYPE') || response.includes('<html>')) return false;
    return true;
  }
}

// RESULT RERANKER - Adaptado para Knowledgebase
class ResultReranker {
  static rerank(results: any[], query: string, maxResults: number = 5): any[] {
    if (!results || results.length === 0) return [];
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const scoredResults = results.map(result => {
      let score = result.similarity || result.relevance_score || 0;
      
      // Detectar tipo de documento
      const isRegimeData = result.tipo_documento === 'regime_urbanistico';
      const isLegalData = ['luos', 'plano_diretor'].includes(result.tipo_documento);
      
      if (isRegimeData) {
        // Processamento especial para dados de regime urbanístico
        const texto = (result.texto || '').toLowerCase();
        
        // Buscar por bairro no texto
        if (queryLower.includes('petrópolis') && texto.includes('petró')) score += 0.8;
        else if (queryLower.includes('petropolis') && texto.includes('petró')) score += 0.8;
        
        // Buscar por ZOT
        const zoneMatch = query.match(/ZOT\s*(\d+)/i);
        if (zoneMatch && texto.includes(`zot ${zoneMatch[1]}`)) {
          score += 0.5;
        }
        
        // Buscar por parâmetros urbanísticos
        if (queryLower.includes('altura') && texto.includes('altura')) score += 0.3;
        if (queryLower.includes('coef') && texto.includes('coef')) score += 0.3;
        if (queryLower.includes('aproveita') && texto.includes('aproveita')) score += 0.3;
        
      } else if (isLegalData) {
        // Processamento para artigos legais
        const texto = (result.texto || '').toLowerCase();
        const titulo = (result.titulo || '').toLowerCase();
        
        // Match exato da query
        if (texto.includes(queryLower)) score += 0.3;
        if (titulo.includes(queryLower)) score += 0.4;
        
        // Match por palavras
        queryWords.forEach(word => {
          if (texto.includes(word)) score += 0.05;
          if (titulo.includes(word)) score += 0.1;
        });
        
        // Match por número de artigo
        const articleMatch = query.match(/art(?:igo)?\.?\s*(\d+)/i);
        if (articleMatch) {
          const articleNum = articleMatch[1];
          if (texto.includes(`artigo ${articleNum}`) ||
              texto.includes(`art. ${articleNum}`) ||
              titulo.includes(`artigo ${articleNum}`)) {
            score += 0.5;
          }
        }
        
        // Relevância por tipo de documento
        if (query.includes('PDUS') && result.tipo_documento === 'plano_diretor') score += 0.2;
        if (query.includes('LUOS') && result.tipo_documento === 'luos') score += 0.2;
      } else {
        // Processamento para Q&A e outros tipos
        const pergunta = (result.pergunta || '').toLowerCase();
        const resposta = (result.resposta || '').toLowerCase();
        const texto = (result.texto || '').toLowerCase();
        
        if (pergunta.includes(queryLower)) score += 0.4;
        if (resposta.includes(queryLower)) score += 0.3;
        if (texto.includes(queryLower)) score += 0.2;
        
        queryWords.forEach(word => {
          if (pergunta.includes(word)) score += 0.1;
          if (resposta.includes(word)) score += 0.05;
          if (texto.includes(word)) score += 0.03;
        });
      }
      
      return { ...result, finalScore: score };
    });
    
    scoredResults.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log(`🎯 Reranked ${results.length} results, returning top ${maxResults}`);
    console.log(`📊 Score range: ${scoredResults[0]?.finalScore?.toFixed(2)} - ${scoredResults[Math.min(maxResults-1, scoredResults.length-1)]?.finalScore?.toFixed(2)}`);
    
    return scoredResults.slice(0, maxResults);
  }
}

// Extração de dados específicos da query
function extractNeighborhoodFromQuery(query: string): string | null {
  const neighborhoods = [
    'petrópolis', 'petropolis', 'centro histórico', 'moinhos de vento',
    'cidade baixa', 'bom fim', 'menino deus', 'santana', 'rio branco',
    'floresta', 'navegantes', 'humaitá', 'farroupilha', 'jardim europa'
  ];
  
  const queryLower = query.toLowerCase();
  for (const neighborhood of neighborhoods) {
    if (queryLower.includes(neighborhood)) {
      return neighborhood;
    }
  }
  return null;
}

function extractZOTFromQuery(query: string): string | null {
  const zotMatch = query.match(/ZOT\s*(\d+)/i);
  return zotMatch ? zotMatch[1] : null;
}

function extractArticleFromQuery(query: string): string | null {
  const articleMatch = query.match(/art(?:igo)?\.?\s*(\d+)/i);
  return articleMatch ? articleMatch[1] : null;
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
  'openai/gpt-4-turbo-preview': { provider: 'openai', model: 'gpt-4-turbo-preview' },
  'openai/gpt-4': { provider: 'openai', model: 'gpt-4' },
  'openai/gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo' },
  'anthropic/claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  'anthropic/claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
  'anthropic/claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  'google/gemini-pro': { provider: 'google', model: 'gemini-pro' },
  'groq/mixtral-8x7b': { provider: 'groq', model: 'mixtral-8x7b-32768' },
  'deepseek/deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const requestData: QueryRequest = await req.json();
    const rawQuery = requestData.query || requestData.message || '';
    const sessionId = requestData.sessionId || `session-${Date.now()}`;
    const userId = requestData.userId || 'anonymous';
    const bypassCache = requestData.bypassCache !== false;
    const selectedModel = requestData.model || 'openai/gpt-4';
    
    // SECURITY VALIDATION
    const securityCheck = SecurityGuardrails.validateInput(rawQuery);
    if (!securityCheck.isValid) {
      console.warn(`🚨 Security violation: ${securityCheck.reason}`);
      return new Response(JSON.stringify({
        response: addStandardFooter(STANDARD_ERROR_MESSAGE),
        confidence: 0,
        sources: {},
        model: selectedModel,
        tokensUsed: 0,
        executionTime: 0,
        cached: false,
        security_blocked: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedQuery = SecurityGuardrails.sanitizeInput(rawQuery);
    const startTime = Date.now();
    
    console.log(`🔍 Query: "${sanitizedQuery}"`);
    console.log(`📋 Model: ${selectedModel}`);
    console.log(`👤 User: ${userId}, Session: ${sessionId}`);

    // ============================================================
    // FASE 1: BUSCA UNIFICADA NA KNOWLEDGEBASE
    // ============================================================
    
    let knowledgebaseResults: any[] = [];
    let totalKnowledgebaseResults = 0;
    
    // Primeiro: Busca por embedding (mais precisa)
    try {
      console.log('🧠 Generating embedding for knowledgebase search...');
      
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: sanitizedQuery,
        }),
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // Busca geral na knowledgebase
        const { data: generalResults, error: generalError } = await supabase.rpc('match_knowledgebase', {
          query_embedding: queryEmbedding,
          match_threshold: 0.6,
          match_count: 15
        });

        if (!generalError && generalResults) {
          knowledgebaseResults.push(...generalResults);
          totalKnowledgebaseResults += generalResults.length;
          console.log(`📚 Found ${generalResults.length} general knowledgebase results`);
        }

        // Busca específica por tipo de documento se relevante
        const neighborhood = extractNeighborhoodFromQuery(sanitizedQuery);
        const zot = extractZOTFromQuery(sanitizedQuery);
        const articleNum = extractArticleFromQuery(sanitizedQuery);

        if (neighborhood || zot) {
          console.log(`🏘️ Searching regime urbanístico for: ${neighborhood || ''} ${zot || ''}`);
          const { data: regimeResults, error: regimeError } = await supabase.rpc('match_knowledgebase', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 10,
            tipo_documento_filter: 'regime_urbanistico'
          });

          if (!regimeError && regimeResults) {
            knowledgebaseResults.push(...regimeResults);
            totalKnowledgebaseResults += regimeResults.length;
            console.log(`🏢 Found ${regimeResults.length} regime urbanístico results`);
          }
        }

        if (articleNum) {
          console.log(`📄 Searching legal articles for: Art. ${articleNum}`);
          const { data: legalResults, error: legalError } = await supabase.rpc('search_articles_knowledgebase', {
            article_number_search: articleNum,
            document_type_filter: sanitizedQuery.includes('LUOS') ? 'luos' : 
                                 sanitizedQuery.includes('PDUS') ? 'plano_diretor' : null
          });

          if (!legalError && legalResults) {
            knowledgebaseResults.push(...legalResults);
            totalKnowledgebaseResults += legalResults.length;
            console.log(`⚖️ Found ${legalResults.length} legal article results`);
          }
        }
      }
    } catch (embeddingError) {
      console.error('❌ Embedding search failed:', embeddingError.message);
    }

    // Segundo: Busca textual como fallback
    if (knowledgebaseResults.length === 0) {
      console.log('🔤 Fallback to text search in knowledgebase...');
      
      const searchTerms = sanitizedQuery.toLowerCase().split(' ').filter(word => word.length > 2);
      for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms
        const { data: textResults, error: textError } = await supabase.rpc('search_knowledgebase_by_content', {
          search_text: term,
          match_count: 5
        });

        if (!textError && textResults) {
          knowledgebaseResults.push(...textResults);
          totalKnowledgebaseResults += textResults.length;
        }
      }
      console.log(`📝 Text search found ${knowledgebaseResults.length} results`);
    }

    // ============================================================
    // FASE 2: RERANKING E CONTEXTUALIZAÇÃO
    // ============================================================
    
    // Remove duplicatas e faz reranking
    const uniqueResults = Array.from(
      new Map(knowledgebaseResults.map(item => [item.id, item])).values()
    );
    
    const rerankedResults = ResultReranker.rerank(uniqueResults, sanitizedQuery, 8);
    
    console.log(`🎯 After reranking: ${rerankedResults.length} results`);

    // Preparar contexto para o LLM
    const contextParts: string[] = [];
    
    rerankedResults.forEach((result, index) => {
      let contextPart = `[${index + 1}] `;
      
      if (result.tipo_documento === 'regime_urbanistico') {
        contextPart += `REGIME URBANÍSTICO: ${result.texto || result.resposta || ''}`;
      } else if (['luos', 'plano_diretor'].includes(result.tipo_documento)) {
        contextPart += `${result.tipo_documento?.toUpperCase()}: `;
        if (result.titulo) contextPart += `${result.titulo} - `;
        contextPart += result.texto || '';
      } else if (result.pergunta) {
        contextPart += `Q&A: ${result.pergunta} | R: ${result.resposta || result.texto || ''}`;
      } else {
        contextPart += `${result.tipo_documento || 'INFO'}: ${result.texto || result.titulo || ''}`;
      }
      
      contextParts.push(contextPart);
    });

    const limitedContext = TokenCounter.limitContext(contextParts, 3500);
    const finalContext = limitedContext.join('\n\n');

    // ============================================================
    // FASE 3: GERAÇÃO DA RESPOSTA COM LLM
    // ============================================================
    
    const systemPrompt = `Você é um assistente especializado em legislação urbanística de Porto Alegre, com foco no PDUS (Plano Diretor de Desenvolvimento Urbano Sustentável), LUOS (Lei de Uso e Ocupação do Solo) e COE (Código de Obras e Edificações).

INSTRUÇÕES CRÍTICAS:
1. Use EXCLUSIVAMENTE o contexto fornecido para responder
2. Se a informação não estiver no contexto, diga claramente que não encontrou
3. Ao citar artigos, SEMPRE identifique a lei de origem (LUOS, PDUS, COE)
4. Para regime urbanístico, apresente dados de forma organizada (altura, coeficientes, etc.)
5. Se houver múltiplas versões de um artigo, apresente TODAS
6. Considere sempre o contexto de conversas anteriores quando disponível

FORMATAÇÃO OBRIGATÓRIA para artigos:
- **Art. X da LUOS/PDUS/COE**: [conteúdo completo]
- Para regime urbanístico: organize em tópicos claros
- Use markdown para melhor legibilidade
- Inclua sempre a fonte da informação

Lembre-se: você deve ser preciso, completo e sempre identificar a origem legal das informações.`;

    const llmConfig = LLM_PROVIDERS[selectedModel] || LLM_PROVIDERS['openai/gpt-4'];
    
    let response = '';
    let confidence = 0;
    let tokensUsed = 0;

    try {
      if (llmConfig.provider === 'openai') {
        const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAIApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: llmConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Responda com base no contexto:\n\nPERGUNTA: ${sanitizedQuery}\n\nCONTEXTO:\n${finalContext}` }
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          response = llmData.choices[0].message.content;
          tokensUsed = llmData.usage?.total_tokens || 0;
          confidence = 0.8;
          
          console.log(`✅ OpenAI response generated (${tokensUsed} tokens)`);
        } else {
          throw new Error(`OpenAI API error: ${llmResponse.status}`);
        }
      } else {
        throw new Error(`Provider ${llmConfig.provider} not implemented yet`);
      }
    } catch (llmError) {
      console.error('❌ LLM generation failed:', llmError.message);
      
      // Fallback: resposta baseada apenas no contexto
      if (rerankedResults.length > 0) {
        response = `Com base nos dados encontrados:\n\n${limitedContext.slice(0, 3).join('\n\n')}`;
        confidence = 0.6;
      } else {
        response = "Não encontrei informações específicas sobre sua consulta na base de dados atual.";
        confidence = 0.1;
      }
    }

    // ============================================================
    // FASE 4: FINALIZAÇÃO E MÉTRICAS
    // ============================================================
    
    const executionTime = Date.now() - startTime;
    
    // Calcular score de qualidade
    const sources = {
      knowledgebase: totalKnowledgebaseResults,
      regime_urbanistico: rerankedResults.filter(r => r.tipo_documento === 'regime_urbanistico').length,
      legal_articles: rerankedResults.filter(r => ['luos', 'plano_diretor'].includes(r.tipo_documento)).length,
      qa_data: rerankedResults.filter(r => r.pergunta).length
    };
    
    const qualityScore = QualityScorer.calculateScore(response, sanitizedQuery, sources);
    confidence = Math.max(confidence, qualityScore);

    // Adicionar footer padrão
    const finalResponse = addStandardFooter(response);

    // Log de métricas
    console.log(`📊 Results: KB=${sources.knowledgebase}, Regime=${sources.regime_urbanistico}, Legal=${sources.legal_articles}, Q&A=${sources.qa_data}`);
    console.log(`⚡ Execution: ${executionTime}ms, Confidence: ${confidence.toFixed(2)}, Tokens: ${tokensUsed}`);

    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: confidence,
      sources: sources,
      model: selectedModel,
      tokensUsed: tokensUsed,
      executionTime: executionTime,
      cached: false,
      agentTrace: {
        query: sanitizedQuery,
        knowledgebaseResults: totalKnowledgebaseResults,
        rerankedResults: rerankedResults.length,
        qualityScore: qualityScore
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Global error:', error);
    
    return new Response(JSON.stringify({
      response: addStandardFooter(STANDARD_ERROR_MESSAGE),
      confidence: 0,
      sources: {},
      model: 'error',
      tokensUsed: 0,
      executionTime: 0,
      cached: false,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});