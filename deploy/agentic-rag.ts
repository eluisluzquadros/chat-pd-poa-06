import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgenticRAGRequest {
  message: string;
  userRole?: string;
  sessionId?: string;
  userId?: string;
  model?: string;
}

interface AgenticRAGResponse {
  response: string;
  confidence: number;
  sources: {
    tabular: number;
    conceptual: number;
  };
  executionTime: number;
  agentTrace: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const requestBody = await req.json();
    const { message, userRole, sessionId, userId, bypassCache }: AgenticRAGRequest & { bypassCache?: boolean } = requestBody;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const agentTrace: any[] = [];
    
    // Initialize Supabase client for cache
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 0: Check Cache (skip if bypassCache is true)
    console.log('📦 Checking cache...', { bypassCache });
    
    try {
      if (!bypassCache) {
        const { data: cachedResponse } = await supabaseClient
          .from('query_cache')
          .select('*')
          .eq('query', message)
          .single();
        
        if (cachedResponse && cachedResponse.confidence >= 0.7) {
          console.log('✅ Cache hit!');
          
          // Update hit count
          await supabaseClient
            .from('query_cache')
            .update({ 
              hit_count: cachedResponse.hit_count + 1,
              last_accessed: new Date()
            })
            .eq('key', cachedResponse.key);
          
          // Return cached response
          const executionTime = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            response: cachedResponse.response,
            confidence: cachedResponse.confidence,
            sources: { cached: true, tabular: 0, conceptual: 0 },
            model: 'agentic-rag-nlq',
            executionTime,
            agentTrace: [{ step: 'cache_hit', timestamp: Date.now() }]
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (error) {
      console.log('Cache check failed, proceeding without cache');
    }

    // Step 1: Query Analysis with Enhanced Logging
    console.log('🔍 Starting Query Analysis...');
    console.log('📝 User Message:', message);
    console.log('👤 User Role:', userRole);
    agentTrace.push({ step: 'query_analysis', timestamp: Date.now(), status: 'started' });
    
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        query: message,
        userRole,
        sessionId
      }),
    });

    const analysisResult = await analysisResponse.json();
    agentTrace.push({ step: 'query_analysis', timestamp: Date.now(), status: 'completed', result: analysisResult });
    
    console.log('📊 Analysis result:', JSON.stringify(analysisResult, null, 2));
    console.log('🏗️ Is construction query:', analysisResult.isConstructionQuery);
    console.log('📋 Required datasets:', analysisResult.requiredDatasets);

    // Check if clarification is needed
    if (analysisResult.needsClarification) {
      console.log('🔔 Clarification needed for address query');
      
      const clarificationResponse: AgenticRAGResponse = {
        response: analysisResult.clarificationMessage || "Para informações precisas sobre construção, por favor informe o bairro onde está localizado o endereço.",
        confidence: 0.9,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: Date.now() - startTime,
        agentTrace: [
          { step: 'query_analysis', timestamp: Date.now(), status: 'completed', result: analysisResult },
          { step: 'clarification_needed', timestamp: Date.now(), status: 'completed' }
        ]
      };

      return new Response(JSON.stringify(clarificationResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sqlResults = null;
    let vectorResults = null;

    // Handle predefined responses
    if (analysisResult.intent === 'predefined_objectives') {
      console.log('🎯 Using predefined response for objectives...');
      
      const predefinedResponse = await fetch(`${supabaseUrl}/functions/v1/predefined-responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          responseType: 'objectives',
          query: message
        }),
      });

      const predefinedResult = await predefinedResponse.json();
      
      const finalResponse: AgenticRAGResponse = {
        response: predefinedResult.response,
        confidence: 1.0,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: Date.now() - startTime,
        agentTrace: [
          { step: 'query_analysis', timestamp: Date.now(), status: 'completed', result: analysisResult },
          { step: 'predefined_response', timestamp: Date.now(), status: 'completed', result: predefinedResult }
        ]
      };

      // Store in chat history
      if (sessionId && userId) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Store user message
        await supabaseClient
          .from('chat_history')
          .insert({
            user_id: userId,
            session_id: sessionId,
            role: 'user',
            message,
            model: 'agentic-rag-nlq',
            created_at: new Date().toISOString()
          });

        // Store assistant response
        await supabaseClient
          .from('chat_history')
          .insert({
            user_id: userId,
            session_id: sessionId,
            role: 'assistant',
            message: predefinedResult.response,
            model: 'agentic-rag-nlq',
            created_at: new Date().toISOString()
          });
      }

      console.log(`✅ Predefined response completed in ${Date.now() - startTime}ms`);
      
      return new Response(JSON.stringify(finalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Execute based on strategy
    if (analysisResult.strategy === 'structured_only' || analysisResult.strategy === 'hybrid') {
      console.log('🔧 Executing SQL Generation...');
      agentTrace.push({ step: 'sql_generation', timestamp: Date.now(), status: 'started' });
      
      const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          query: message,
          analysisResult,
          userRole
        }),
      });

      sqlResults = await sqlResponse.json();
      agentTrace.push({ step: 'sql_generation', timestamp: Date.now(), status: 'completed', result: sqlResults });
      
      // Enhanced SQL Results Logging with Data Validation
      console.log('🔧 SQL Generation completed');
      console.log('📊 SQL queries generated:', sqlResults.sqlQueries?.length || 0);
      
      if (sqlResults.executionResults) {
        console.log('📈 Execution results:', sqlResults.executionResults.length);
        sqlResults.executionResults.forEach((result, index) => {
          if (result.data && result.data.length > 0) {
            console.log(`Dataset ${index + 1}:`, {
              purpose: result.purpose,
              rows: result.data.length,
              hasZona: result.data[0]?.hasOwnProperty?.('Zona') || result.data[0]?.zona,
              hasBairro: result.data[0]?.hasOwnProperty?.('Bairro') || result.data[0]?.bairro,
              hasAltura: result.data[0]?.hasOwnProperty?.('Altura Máxima - Edificação Isolada'),
              hasCA: result.data[0]?.hasOwnProperty?.('Coeficiente de Aproveitamento - Básico'),
              sampleZonas: result.data.slice(0, 3).map(row => row.Zona || row.zona).filter(Boolean),
              sampleBairros: result.data.slice(0, 3).map(row => row.Bairro || row.bairro).filter(Boolean)
            });
            
            // Validate data accuracy for construction queries
            if (analysisResult.isConstructionQuery) {
              const requiredFields = ['Zona', 'Altura Máxima - Edificação Isolada', 'Coeficiente de Aproveitamento - Básico', 'Coeficiente de Aproveitamento - Máximo'];
              const missingFields = requiredFields.filter(field => !result.data[0]?.hasOwnProperty?.(field));
              
              if (missingFields.length > 0) {
                console.log('⚠️ VALIDATION WARNING: Missing required fields:', missingFields);
              } else {
                console.log('✅ VALIDATION OK: All required fields present');
              }
              
              // Check for specific neighborhood accuracy
              const requestedBairro = extractBairroFromQuery(message);
              if (requestedBairro) {
                const wrongBairros = result.data.filter(row => 
                  row.Bairro && row.Bairro !== requestedBairro
                );
                if (wrongBairros.length > 0) {
                  console.log('⚠️ DATA CONTAMINATION WARNING: Found wrong neighborhoods:', 
                    wrongBairros.map(row => row.Bairro).slice(0, 3));
                }
              }
            }
          }
        });
      }
    }

    if (analysisResult.strategy === 'unstructured_only' || analysisResult.strategy === 'hybrid') {
      console.log('🔍 Executing Vector Search...');
      agentTrace.push({ step: 'vector_search', timestamp: Date.now(), status: 'started' });
      
      try {
        const vectorResponse = await fetch(`${supabaseUrl}/functions/v1/enhanced-vector-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            message,
            userRole,
            context: analysisResult.entities
          }),
        });

        if (vectorResponse.ok) {
          vectorResults = await vectorResponse.json();
          agentTrace.push({ step: 'vector_search', timestamp: Date.now(), status: 'completed', result: vectorResults });
        } else {
          // Fallback to existing vector search
          const fallbackResponse = await fetch(`${supabaseUrl}/functions/v1/match-documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({ query: message }),
          });
          
          if (fallbackResponse.ok) {
            vectorResults = await fallbackResponse.json();
          }
        }
      } catch (vectorError) {
        console.error('Vector search error:', vectorError);
        agentTrace.push({ step: 'vector_search', timestamp: Date.now(), status: 'error', error: vectorError.message });
      }
    }

    // Step 3: Response Synthesis
    console.log('📝 Synthesizing Response...');
    agentTrace.push({ step: 'response_synthesis', timestamp: Date.now(), status: 'started' });
    
    const synthesisResponse = await fetch(`${supabaseUrl}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        originalQuery: message,
        analysisResult,
        sqlResults,
        vectorResults,
        userRole
      }),
    });

    const synthesisResult = await synthesisResponse.json();
    agentTrace.push({ step: 'response_synthesis', timestamp: Date.now(), status: 'completed', result: synthesisResult });
    
    // Track quality metrics
    const responseTime = Date.now() - startTime;
    const qualityMetrics = {
      sessionId: sessionId || '',
      query: message,
      response: synthesisResult.response || '',
      responseTime,
      hasValidResponse: !synthesisResult.response?.includes('versão Beta'),
      hasBetaMessage: synthesisResult.response?.toLowerCase().includes('versão beta') || false,
      hasTable: synthesisResult.response?.includes('|') || false,
      confidence: synthesisResult.confidence || 0,
      category: analysisResult.intent || 'general',
      timestamp: new Date()
    };
    
    // Store quality metrics asynchronously
    if (sessionId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      supabaseClient
        .from('quality_metrics')
        .insert({
          session_id: qualityMetrics.sessionId,
          query: qualityMetrics.query,
          response: qualityMetrics.response.substring(0, 1000),
          response_time: qualityMetrics.responseTime,
          has_valid_response: qualityMetrics.hasValidResponse,
          has_beta_message: qualityMetrics.hasBetaMessage,
          has_table: qualityMetrics.hasTable,
          confidence: qualityMetrics.confidence,
          category: qualityMetrics.category,
          created_at: qualityMetrics.timestamp
        })
        .then(() => console.log('Quality metrics tracked'))
        .catch(err => console.error('Error tracking quality metrics:', err));
    }
    
    // Enhanced Response Logging
    console.log('📝 Response Synthesis completed');
    console.log('💯 Final confidence:', synthesisResult.confidence);
    console.log('📊 Sources used:', synthesisResult.sources);
    console.log('📄 Response length:', synthesisResult.response?.length || 0);
    
    // Validate final response for construction queries
    if (analysisResult.isConstructionQuery) {
      const hasTable = synthesisResult.response?.includes('|') || synthesisResult.response?.includes('Zona');
      const hasRequiredTerms = ['Altura', 'Coeficiente'].every(term => 
        synthesisResult.response?.includes(term)
      );
      
      console.log('🏗️ Construction Query Validation:');
      console.log('  - Has table format:', hasTable);
      console.log('  - Has required terms:', hasRequiredTerms);
      
      if (!hasTable || !hasRequiredTerms) {
        console.log('⚠️ RESPONSE QUALITY WARNING: Construction query missing expected format');
      }
    }
    
    const executionTime = Date.now() - startTime;

    // Step 4: Store execution for analytics
    if (sessionId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseClient
        .from('agent_executions')
        .update({
          intent_classification: analysisResult,
          sql_queries: sqlResults?.sqlQueries || [],
          vector_results: vectorResults,
          final_response: synthesisResult.response,
          execution_time_ms: executionTime,
          confidence_score: synthesisResult.confidence
        })
        .eq('session_id', sessionId)
        .eq('user_query', message);
    }

    // Step 5: Store in chat history
    if (sessionId && userId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Store user message
      await supabaseClient
        .from('chat_history')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          message,
          model: 'agentic-rag-nlq',
          created_at: new Date().toISOString()
        });

      // Store assistant response
      await supabaseClient
        .from('chat_history')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          message: synthesisResult.response,
          model: 'agentic-rag-nlq',
          created_at: new Date().toISOString()
        });
    }

    const finalResponse: AgenticRAGResponse = {
      response: synthesisResult.response,
      confidence: synthesisResult.confidence,
      sources: synthesisResult.sources,
      executionTime,
      agentTrace
    };
    
    // Store in cache if response is good quality
    if (synthesisResult.confidence >= 0.7 && !synthesisResult.response?.includes('versão Beta')) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message.toLowerCase().trim());
        const hash = await crypto.subtle.digest('SHA-256', data);
        const cacheKey = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        await supabaseClient
          .from('query_cache')
          .upsert({
            key: cacheKey,
            query: message,
            response: synthesisResult.response,
            confidence: synthesisResult.confidence,
            category: analysisResult.intent || 'general',
            timestamp: new Date(),
            last_accessed: new Date(),
            hit_count: 0
          });
        
        console.log('📦 Response cached successfully');
      } catch (cacheError) {
        console.error('Failed to cache response:', cacheError);
      }
    }

    console.log(`✅ Agentic RAG completed in ${executionTime}ms`);

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agentic RAG error:', error);
    
    const fallbackResponse = {
      response: `Desculpe, sou uma versão Beta e ainda não consigo responder a essa pergunta.

📍 **Explore mais:**
- [Mapa com Regras Construtivas:](https://bit.ly/3ILdXRA)
- [Contribua com sugestões](https://bit.ly/4oefZKm)
- [Audiência Pública](https://bit.ly/4o7AWqb)

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br

💬 **Sua pergunta é importante!** Considere enviá-la pelos canais oficiais para contribuir com o aperfeiçoamento do plano.`,
      confidence: 0.1,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: Date.now(),
      agentTrace: [{ step: 'error', timestamp: Date.now(), error: error.message }]
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract neighborhood from user query
function extractBairroFromQuery(query: string): string | null {
  const bairroPatterns = [
    /bairro\s+([a-záàâãéêíóôõúç\s]+)/gi,
    /\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]{3,})\b/g
  ];
  
  const commonBairros = [
    'PETRÓPOLIS', 'BOA VISTA', 'BOA VISTA DO SUL', 'CENTRO', 'CIDADE BAIXA',
    'MENINO DEUS', 'AZENHA', 'PRAIA DE BELAS', 'CRISTAL', 'JARDIM SÃO PEDRO',
    'LOMBA DO PINHEIRO', 'COSTA E SILVA', 'VILA NOVA', 'MEDIANEIRA'
  ];
  
  const queryUpper = query.toUpperCase();
  
  // Try direct neighborhood match first
  for (const bairro of commonBairros) {
    if (queryUpper.includes(bairro)) {
      return bairro;
    }
  }
  
  // Try pattern matching
  for (const pattern of bairroPatterns) {
    const matches = query.match(pattern);
    if (matches) {
      const candidate = matches[0].replace(/bairro\s+/gi, '').trim().toUpperCase();
      if (commonBairros.includes(candidate)) {
        return candidate;
      }
    }
  }
  
  return null;
}