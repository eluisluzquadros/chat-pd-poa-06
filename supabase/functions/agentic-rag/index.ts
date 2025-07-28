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
    const { message, userRole, sessionId, userId }: AgenticRAGRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const agentTrace: any[] = [];

    // Step 1: Query Analysis
    console.log('🔍 Starting Query Analysis...');
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
    
    console.log('Analysis result:', analysisResult);

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
      console.log('SQL results:', sqlResults);
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

    console.log(`✅ Agentic RAG completed in ${executionTime}ms`);

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agentic RAG error:', error);
    
    const fallbackResponse = {
      response: `Desculpe, sou uma versão Beta e ainda não consigo responder a essa pergunta.

📍 **Explore mais:**
- [Mapa Interativo PDUS](https://bit.ly/3ILdXRA)
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