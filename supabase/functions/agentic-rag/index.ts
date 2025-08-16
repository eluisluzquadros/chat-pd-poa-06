import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Memória da conversa
const conversationMemory = new Map<string, Array<{role: string, content: string}>>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Enhanced error handling for JSON parsing
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('❌ Invalid JSON in request body:', jsonError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: jsonError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, message, sessionId, userId, bypassCache, model, conversationId, userRole } = requestBody;
    const userMessage = message || query || '';

    // Sanitize and whitelist model selection with safe fallbacks
    const sanitizeModel = (input: string | undefined): string => {
      const fallback = 'anthropic/claude-3-5-sonnet-20241022';
      if (!input) return fallback;
      const raw = input.trim();
      const lower = raw.toLowerCase();
      if (lower === 'gpt-5' || lower.endsWith('/gpt-5')) {
        console.log('⚠️ Model "gpt-5" not supported. Falling back to', fallback);
        return fallback;
      }
      // Normalize common aliases
      const aliasMap: Record<string, string> = {
        'openai/gpt-4o': 'openai/gpt-4o-2024-11-20',
        'gpt-4o': 'openai/gpt-4o-2024-11-20',
        'gpt-4.1': 'openai/gpt-4.1',
        'claude-3-5-sonnet': 'anthropic/claude-3-5-sonnet-20241022',
        'claude-opus-4.1': 'anthropic/claude-opus-4-1-20250805',
      };
      const normalizedWithProvider = raw.includes('/') ? raw : `anthropic/${raw}`;
      const mapped = aliasMap[lower] || aliasMap[normalizedWithProvider.toLowerCase()] || normalizedWithProvider;
      const allowed = new Set([
        'anthropic/claude-opus-4-1-20250805',
        'anthropic/claude-3-5-sonnet-20241022',
        'openai/gpt-4o-2024-11-20',
        'openai/gpt-4o-mini-2024-07-18',
        'openai/gpt-3.5-turbo-0125',
        'openai/gpt-4.1',
      ]);
      if (!allowed.has(mapped)) {
        console.log('⚠️ Model not allowed:', raw, '→ falling back to', fallback);
        return fallback;
      }
      return mapped;
    };

    const selectedModel = sanitizeModel(model);
    
    console.log(`🔥 AGENTIC-RAG: Using model: ${selectedModel} (received: ${model})`);
    
    // Parse provider and model from the format "provider/model"
    const [provider, modelName] = selectedModel.includes('/') 
      ? selectedModel.split('/') 
      : ['anthropic', selectedModel];
    
    console.log(`🔥 AGENTIC-RAG: Parsed - Provider: ${provider}, Model: ${modelName}`);
    
    if (!userMessage) {
      throw new Error('Query or message is required');
    }
    
    // Inicializar Supabase client with enhanced error handling
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const agentTrace = [];
    
    // Definir authKey no início
    const authKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    // ========================================
    // VERIFICAR CACHE PRIMEIRO
    // ========================================
    if (!bypassCache) {
      console.log('🔍 Checking cache for query:', userMessage);
      
      try {
        // Normalizar query para busca no cache
        const normalizedQuery = userMessage.toLowerCase().trim();
        
        // Buscar no cache pelo texto normalizado
        const { data: cachedResult } = await supabase
          .from('query_cache')
          .select('*')
          .eq('query_text', normalizedQuery)
          .single();
        
        if (cachedResult && cachedResult.expires_at > new Date().toISOString()) {
          console.log('✅ Cache HIT! Returning cached response');
          
          // Incrementar hit count
          await supabase
            .from('query_cache')
            .update({ 
              hit_count: (cachedResult.hit_count || 0) + 1,
              last_accessed: new Date().toISOString()
            })
            .eq('id', cachedResult.id);
          
          // Formatar resposta se necessário
          let formattedResponse = cachedResult.result;
          if (cachedResult.query_type === 'regime') {
            const formatResponse = await fetch(`${supabaseUrl}/functions/v1/format-table-response`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authKey}`,
              },
              body: JSON.stringify({
                query: userMessage,
                response: cachedResult.result,
                type: 'regime'
              })
            });
            
            if (formatResponse.ok) {
              const formatted = await formatResponse.json();
              formattedResponse = formatted.formatted || cachedResult.result;
            }
          }
          
          return new Response(JSON.stringify({
            response: formattedResponse.resposta || formattedResponse,
            confidence: 1.0,
            sources: { cached: true },
            executionTime: Date.now() - startTime,
            agentTrace: [{ step: 'cache_hit', timestamp: Date.now() }],
            conversationId: conversationId || sessionId || 'default'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (cacheError) {
        console.error('Cache check error:', cacheError);
        // Continue sem cache se houver erro
      }
    }
    
    // ========================================
    // Pipeline RAG otimizado para regime_urbanistico
    // ========================================
    
    // Gerenciar memória da conversa
    const convId = conversationId || sessionId || 'default';
    if (!conversationMemory.has(convId)) {
      conversationMemory.set(convId, []);
    }
    const conversationHistory = conversationMemory.get(convId)!;
    
    // Step 1: Query Analysis
    console.log('🔍 Analyzing query:', userMessage);
    agentTrace.push({ step: 'query_analysis', timestamp: Date.now() });
    
    // Add timeout for query analyzer
    const analysisController = new AbortController();
    const analysisTimeout = setTimeout(() => analysisController.abort(), 10000); // 10 second timeout
    
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify({ 
        query: userMessage, 
        sessionId,
        userRole: userRole || 'citizen', // Standardize userRole parameter
        conversationHistory: conversationHistory.slice(-5)
      }),
      signal: analysisController.signal
    });
    
    clearTimeout(analysisTimeout);

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error(`❌ Query analyzer failed: ${analysisResponse.status} - ${errorText}`);
      throw new Error(`Query analyzer failed: ${analysisResponse.status}`);
    }

    const analysisResult = await analysisResponse.json();
    agentTrace.push({ step: 'query_analysis_complete', result: analysisResult });
    
    // Handle simple greetings
    if (userMessage.toLowerCase().match(/^(oi|olá|ola|bom dia|boa tarde|boa noite)$/)) {
      const greetingResponse = 'Olá! Sou o assistente do Plano Diretor de Porto Alegre. Como posso ajudá-lo hoje? Você pode me perguntar sobre:\n\n• Zonas e bairros\n• Altura máxima permitida\n• Coeficientes de aproveitamento\n• Regras construtivas\n• E muito mais!';
      
      conversationHistory.push({ role: 'user', content: userMessage });
      conversationHistory.push({ role: 'assistant', content: greetingResponse });
      
      return new Response(JSON.stringify({
        response: greetingResponse,
        confidence: 1.0,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: Date.now() - startTime,
        agentTrace,
        conversationId: convId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Step 2: SQL Generation (if needed)
    let sqlResults = null;
    let vectorResults = null; // Initialize vectorResults
    
    if (analysisResult.strategy === 'structured_only' || 
        analysisResult.strategy === 'hybrid' ||
        analysisResult.needsRiskData === true ||
        analysisResult.queryType === 'risk' ||
        analysisResult.queryType === 'counting' ||
        (analysisResult.entities?.zots && analysisResult.entities.zots.length > 0)) {
      console.log('🔧 Generating SQL...');
      agentTrace.push({ step: 'sql_generation', timestamp: Date.now() });
      
      // Adicionar hints para queries específicas
      const sqlHints = {
        needsMax: userMessage.toLowerCase().includes('mais alta') || 
                  userMessage.toLowerCase().includes('máxima') ||
                  userMessage.toLowerCase().includes('maior'),
        needsMin: userMessage.toLowerCase().includes('mais baixa') || 
                  userMessage.toLowerCase().includes('mínima') ||
                  userMessage.toLowerCase().includes('menor'),
        needsAvg: userMessage.toLowerCase().includes('média') || 
                  userMessage.toLowerCase().includes('médio'),
        needsAll: userMessage.toLowerCase().includes('todas as zonas') || 
                  userMessage.toLowerCase().includes('todos os bairros'),
        
        // NOVOS hints para outras tabelas
        needsRiskData: analysisResult.needsRiskData || analysisResult.queryType === 'risk',
        needsZotData: analysisResult.entities?.zots?.length > 0,
        targetTable: analysisResult.needsRiskData ? 'bairros_risco_desastre' : 
                    analysisResult.entities?.zots?.length > 0 ? 'zots_bairros' : 
                    'regime_urbanistico'
      };
      
      // Log detailed SQL generation debug info
      console.log('🔍 SQL GENERATION DEBUG:', {
        originalQuery: userMessage,
        analysisResult: analysisResult,
        sqlHints: sqlHints,
        timestamp: new Date().toISOString()
      });
      
      // Add timeout for SQL generation
      const sqlController = new AbortController();
      const sqlTimeout = setTimeout(() => sqlController.abort(), 12000); // 12 second timeout
      
      const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          query: userMessage,
          analysisResult,
          hints: sqlHints,
          debug: true // Add debug flag
        }),
        signal: sqlController.signal
      });
      
      clearTimeout(sqlTimeout);

      if (sqlResponse.ok) {
        sqlResults = await sqlResponse.json();
        
        // Enhanced logging for SQL results
        console.log('📊 SQL RESPONSE RECEIVED:', {
          hasResults: sqlResults.executionResults?.length > 0,
          queryCount: sqlResults.sqlQueries?.length || 0,
          executionResultsCount: sqlResults.executionResults?.length || 0,
          confidence: sqlResults.confidence
        });
        
        // Log each execution result
        if (sqlResults.executionResults) {
          sqlResults.executionResults.forEach((result, index) => {
            console.log(`📋 Result ${index + 1}:`, {
              hasError: !!result.error,
              dataCount: result.data?.length || 0,
              table: result.table,
              purpose: result.purpose,
              firstResult: result.data?.[0] || null
            });
          });
        }
        
        agentTrace.push({ step: 'sql_generation_complete', hasResults: sqlResults.executionResults?.length > 0 });
        
        // NOVO: Validar SQL gerado para detectar problemas
        try {
          const validationResponse = await fetch(`${supabaseUrl}/functions/v1/sql-validator`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authKey}`,
            },
            body: JSON.stringify({
              query: userMessage,
              sqlResults: sqlResults,
              expectedTable: analysisResult.needsRiskData ? 'bairros_risco_desastre' : 'regime_urbanistico',
              queryType: analysisResult.queryType || 'general'
            }),
          });

          if (validationResponse.ok) {
            const validation = await validationResponse.json();
            agentTrace.push({ 
              step: 'sql_validation', 
              isValid: validation.isValid,
              confidence: validation.confidence,
              issues: validation.issues 
            });
            
            // Se a validação falhou criticamente, tentar sql-generator novamente
            if (!validation.isValid && validation.shouldTriggerAlert) {
              console.log('🚨 SQL validation failed - attempting recovery...');
              // Aqui poderia tentar regenerar o SQL com hints específicos
            }
          }
        } catch (validationError) {
          console.error('SQL validation error:', validationError);
        }
      }
    }

    // Step 2.5: Vector Search (ATIVADO PARA QUERIES ESPECÍFICAS)
    if (analysisResult.metadata?.isLegalQuery && analysisResult.metadata?.expectedArticles?.length > 0) {
      console.log('🔍 Performing vector search for legal articles...');
      agentTrace.push({ step: 'vector_search', timestamp: Date.now() });
      
      try {
        // BUSCA DIRETA EM DOCUMENT_EMBEDDINGS PARA CERTIFICAÇÃO
        if (userMessage.toLowerCase().includes('certificação') && userMessage.toLowerCase().includes('sustentabilidade')) {
          const { data: certResults, error } = await supabase
            .from('document_embeddings')
            .select('content_chunk, chunk_metadata')
            .or(`content_chunk.ilike.%certificação%sustentabilidade%,content_chunk.ilike.%art%81%,content_chunk.ilike.%artigo 81%`)
            .limit(5);

          if (!error && certResults && certResults.length > 0) {
            vectorResults = {
              results: certResults.map(doc => ({
                content: doc.content_chunk,
                metadata: doc.chunk_metadata,
                similarity: 0.9
              }))
            };
            console.log('✅ Vector search complete:', vectorResults.results?.length || 0, 'results');
            agentTrace.push({ step: 'vector_search_complete', resultsCount: vectorResults.results?.length || 0 });
          }
        }
      } catch (error) {
        console.error('Vector search error (non-critical):', error);
        agentTrace.push({ step: 'vector_search_skipped', reason: error.message });
        // Continue without vector results
      }
    }
    
    // Step 2.5: Vector Search for Conceptual Queries
    if ((!sqlResults || !sqlResults.executionResults?.length) && 
        (analysisResult.strategy === 'unstructured_only' || 
         analysisResult.intent === 'conceptual' ||
         userMessage.toLowerCase().includes('plano') ||
         userMessage.toLowerCase().includes('política') ||
         userMessage.toLowerCase().includes('prevê') ||
         userMessage.toLowerCase().includes('como') ||
         userMessage.toLowerCase().includes('o que'))) {
      console.log('🔍 Conceptual query detected, using vector search...');
      agentTrace.push({ step: 'vector_search_conceptual', timestamp: Date.now() });
      
      try {
        const vectorResponse = await fetch(`${supabaseUrl}/functions/v1/enhanced-vector-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
          },
          body: JSON.stringify({
            query: userMessage,
            includeMetadata: true,
            hybridSearch: true,
            limit: 5
          })
        });
        
        if (vectorResponse.ok) {
          vectorResults = await vectorResponse.json();
          console.log('✅ Vector search for conceptual query successful');
        }
      } catch (vectorError) {
        console.warn('Vector search failed:', vectorError);
      }
    }
    
    // Step 3: Response Synthesis with both SQL and Vector results
    console.log('📝 Synthesizing response...');
    agentTrace.push({ step: 'response_synthesis', timestamp: Date.now() });
    
    // Use v2 response synthesizer for stability
    const synthesizerEndpoint = 'response-synthesizer-v2';
    
    console.log(`Using synthesizer: ${synthesizerEndpoint}`);
    console.log('Synthesis inputs:', {
      hasSqlResults: !!sqlResults,
      hasVectorResults: !!vectorResults,
      isHybrid: analysisResult.strategy === 'hybrid'
    });
    
    // Add timeout for response synthesis
    const synthesisController = new AbortController();
    const synthesisTimeout = setTimeout(() => synthesisController.abort(), 15000); // 15 second timeout
    
    const synthesisResponse = await fetch(`${supabaseUrl}/functions/v1/${synthesizerEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify({
        originalQuery: userMessage,
        analysisResult,
        sqlResults,
        vectorResults, // Now includes vector results when available
        model: selectedModel,
        conversationHistory: conversationHistory.slice(-5)
      }),
      signal: synthesisController.signal
    });
    
    clearTimeout(synthesisTimeout);

    if (!synthesisResponse.ok) {
      throw new Error(`Response synthesis failed: ${synthesisResponse.status}`);
    }

    const synthesisResult = await synthesisResponse.json();
    agentTrace.push({ step: 'response_synthesis_complete' });
    
    // Formatar resposta se for sobre regime urbanístico
    let finalResponse = synthesisResult.response;
    if (analysisResult.strategy === 'structured_only' && sqlResults?.executionResults?.length > 0) {
      try {
        const formatResponse = await fetch(`${supabaseUrl}/functions/v1/format-table-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
          },
          body: JSON.stringify({
            query: userMessage,
            response: sqlResults.executionResults[0]?.data || sqlResults.executionResults,
            type: 'regime'
          })
        });
        
        if (formatResponse.ok) {
          const formatted = await formatResponse.json();
          if (formatted.formatted && formatted.has_table) {
            finalResponse = formatted.formatted;
            agentTrace.push({ step: 'table_formatting_applied' });
          }
        }
      } catch (formatError) {
        console.error('Format error:', formatError);
      }
    }
    
    // Salvar no cache se a resposta for bem-sucedida
    if (!bypassCache && synthesisResult.confidence > 0.7) {
      try {
        const normalizedQuery = userMessage.toLowerCase().trim();
        
        // Criar um hash simples para compatibilidade
        let hash = 0;
        for (let i = 0; i < normalizedQuery.length; i++) {
          const char = normalizedQuery.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        const simpleHash = Math.abs(hash).toString(16);
        
        // Determinar tipo de query
        let queryType = 'general';
        if (analysisResult.strategy === 'structured_only') {
          queryType = 'regime';
        } else if (userMessage.toLowerCase().includes('o que') || userMessage.includes('?')) {
          queryType = 'qa';
        }
        
        // Salvar no cache
        await supabase
          .from('query_cache')
          .upsert({
            query_hash: simpleHash,
            query_text: normalizedQuery,
            query_type: queryType,
            result: {
              resposta: finalResponse,
              confidence: synthesisResult.confidence,
              sources: synthesisResult.sources
            },
            response_time_ms: Date.now() - startTime,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
            created_at: new Date().toISOString(),
            hit_count: 0
          }, {
            onConflict: 'query_text' // Usar query_text como chave única
          });
        
        agentTrace.push({ step: 'cached_response' });
      } catch (cacheError) {
        console.error('Cache save error:', cacheError);
      }
    }
    
    // Adicionar à memória da conversa
    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: finalResponse });
    
    // Limitar memória a 20 mensagens
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, conversationHistory.length - 20);
    }
    
    const executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: synthesisResult.confidence,
      sources: synthesisResult.sources,
      executionTime,
      agentTrace,
      model: selectedModel,
      tokensUsed: synthesisResult.tokensUsed,
      conversationId: convId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agentic RAG error:', error);
    
    const fallbackResponse = {
      response: `Desculpe, ocorreu um erro ao processar sua solicitação: ${error.message}`,
      confidence: 0.1,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: Date.now() - startTime,
      agentTrace: [{ step: 'error', error: error.message, stack: error.stack }],
      error: error.message
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});