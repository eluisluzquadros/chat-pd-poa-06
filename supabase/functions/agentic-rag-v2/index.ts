import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agentic-RAG v2 - Main Entry Point
 * Redireciona queries para o Master Orchestrator
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Forward to orchestrator-master
    const orchestratorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/orchestrator-master`;
    
    const response = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: body.query || body.message,
        sessionId: body.sessionId || `session_${Date.now()}`,
        options: {
          useAgenticRAG: true,
          bypassCache: body.bypassCache,
          model: body.model || 'gpt-3.5-turbo',
          ...body.options
        }
      })
    });
    
    if (!response.ok) {
      // Fallback to original agentic-rag if orchestrator fails
      console.log('⚠️ Orchestrator failed, falling back to original pipeline');
      
      const fallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/agentic-rag`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      const fallbackData = await fallbackResponse.json();
      
      return new Response(JSON.stringify({
        ...fallbackData,
        metadata: {
          ...fallbackData.metadata,
          pipeline: 'legacy',
          fallback: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    // Add pipeline metadata
    const enrichedResponse = {
      ...data,
      metadata: {
        ...data.metadata,
        pipeline: 'agentic-v2',
        timestamp: new Date().toISOString()
      }
    };
    
    return new Response(JSON.stringify(enrichedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agentic-RAG v2 error:', error);
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
      confidence: 0,
      error: error.message,
      metadata: {
        pipeline: 'agentic-v2',
        error: true
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
    
    // Gerenciar memória da conversa
    const convId = conversationId || sessionId || 'default';
    if (!conversationMemory.has(convId)) {
      conversationMemory.set(convId, []);
    }
    const conversationHistory = conversationMemory.get(convId)!;
    
    const authKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    // Step 1: Query Analysis
    console.log('🔍 Analyzing query:', userMessage);
    agentTrace.push({ step: 'query_analysis', timestamp: Date.now() });
    
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify({ 
        query: userMessage, 
        sessionId,
        conversationHistory: conversationHistory.slice(-5)
      }),
    });

    if (!analysisResponse.ok) {
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
    if (analysisResult.strategy === 'structured_only' || analysisResult.strategy === 'hybrid') {
      console.log('🔧 Generating SQL...');
      agentTrace.push({ step: 'sql_generation', timestamp: Date.now() });
      
      // MELHORADO: Adicionar hints para queries específicas
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
                  userMessage.toLowerCase().includes('todos os bairros')
      };
      
      const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          query: userMessage,
          analysisResult,
          hints: sqlHints
        }),
      });

      if (sqlResponse.ok) {
        sqlResults = await sqlResponse.json();
        agentTrace.push({ step: 'sql_generation_complete', hasResults: sqlResults.executionResults?.length > 0 });
      }
    }

    // Step 3: Response Synthesis
    console.log('📝 Synthesizing response...');
    agentTrace.push({ step: 'response_synthesis', timestamp: Date.now() });
    
    const synthesizerEndpoint = 'response-synthesizer';
    
    console.log(`Using synthesizer: ${synthesizerEndpoint}`);
    
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
        vectorResults: null,
        model: selectedModel,
        conversationHistory: conversationHistory.slice(-5),
        // NOVO: Passar casos de teste relevantes para o synthesizer
        testCases: testCases?.filter(tc => {
          const words = userMessage.toLowerCase().split(' ');
          return words.some(word => 
            word.length > 3 && tc.question.toLowerCase().includes(word)
          );
        }).slice(0, 3) // Limitar a 3 casos relevantes
      }),
    });

    if (!synthesisResponse.ok) {
      throw new Error(`Response synthesis failed: ${synthesisResponse.status}`);
    }

    const synthesisResult = await synthesisResponse.json();
    agentTrace.push({ step: 'response_synthesis_complete' });
    
    // Adicionar à memória da conversa
    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: synthesisResult.response });
    
    // Limitar memória a 20 mensagens
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, conversationHistory.length - 20);
    }
    
    const executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      response: synthesisResult.response,
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