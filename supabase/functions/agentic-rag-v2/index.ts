import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agentic-RAG v2 - SIMPLIFICADO E DIRETO
 * Pipeline otimizado baseado nas consultas que funcionaram
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = body.query || body.message;
    const model = body.model || 'gpt-3.5-turbo';
    const sessionId = body.sessionId || `session_${Date.now()}`;
    
    console.log('🔥 Agentic-RAG v2 SIMPLIFICADO:', { 
      query: query,
      model: model,
      sessionId: sessionId 
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();

    // PASSO 1: SQL GENERATION DIRETO
    console.log('📊 Gerando e executando SQL...');
    
    const sqlGenResponse = await supabaseClient.functions.invoke('sql-generator-v2', {
      body: {
        query: query,
        analysisResult: { type: 'direct_search', confidence: 0.9 }
      }
    });

    let sqlResults = null;
    if (sqlGenResponse.data && !sqlGenResponse.error) {
      sqlResults = sqlGenResponse.data;
      console.log('✅ SQL gerado e executado:', {
        queriesCount: sqlResults.sqlQueries?.length || 0,
        hasResults: sqlResults.executionResults?.length || 0
      });
    } else {
      console.error('❌ Erro no SQL Generator:', sqlGenResponse.error);
    }

    // PASSO 2: VECTOR SEARCH (apenas se SQL não trouxe resultados suficientes)
    let vectorResults = null;
    const hasValidSqlData = sqlResults?.executionResults?.some(r => r.data && r.data.length > 0);
    
    if (!hasValidSqlData) {
      console.log('🔍 Executando vector search...');
      
      try {
        // Buscar diretamente nos embeddings
        const { data: embeddingResults, error: embeddingError } = await supabaseClient
          .rpc('execute_sql_query', { 
            query_text: `
              SELECT content_chunk, chunk_metadata, 
                     CASE 
                       WHEN content_chunk ILIKE '%${query.split(' ').join('%')}%' THEN 0.9
                       ELSE 0.5 
                     END as similarity
              FROM document_embeddings 
              WHERE content_chunk ILIKE '%${query.split(' ').slice(0, 3).join('%')}%'
                 OR chunk_metadata->>'hasImportantKeywords' = 'true'
              ORDER BY similarity DESC, 
                       CASE 
                         WHEN chunk_metadata->>'articleNumber' IS NOT NULL THEN 1
                         ELSE 2 
                       END
              LIMIT 5
            `
          });

        if (!embeddingError && embeddingResults?.length > 0) {
          vectorResults = {
            results: embeddingResults.map(r => ({
              content: r.content_chunk,
              metadata: r.chunk_metadata,
              similarity: r.similarity
            }))
          };
          console.log('✅ Vector search executado:', embeddingResults.length, 'resultados');
        }
      } catch (vectorError) {
        console.error('❌ Erro no vector search:', vectorError);
      }
    }

    // PASSO 3: RESPONSE SYNTHESIS
    console.log('📝 Sintetizando resposta...');
    
    const synthResponse = await supabaseClient.functions.invoke('response-synthesizer-v2', {
      body: {
        originalQuery: query,
        analysisResult: { type: 'direct', confidence: 0.9 },
        sqlResults: sqlResults,
        vectorResults: vectorResults,
        model: model
      }
    });

    if (synthResponse.error) {
      console.error('❌ Erro no synthesizer:', synthResponse.error);
      throw new Error(`Response synthesis failed: ${synthResponse.error.message}`);
    }

    const executionTime = Date.now() - startTime;
    
    const finalResponse = {
      response: synthResponse.data?.response || 'Não foi possível processar sua solicitação.',
      confidence: synthResponse.data?.confidence || 0.5,
      sources: synthResponse.data?.sources || { tabular: 0, conceptual: 0 },
      executionTime: executionTime,
      metadata: {
        pipeline: 'agentic-v2-simplified',
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        model: model,
        hasSqlResults: !!sqlResults?.executionResults?.length,
        hasVectorResults: !!vectorResults?.results?.length
      }
    };

    console.log('✅ Resposta final gerada:', {
      confidence: finalResponse.confidence,
      executionTime: executionTime,
      sources: finalResponse.sources
    });

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agentic-RAG v2 error:', error);
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      error: error.message,
      metadata: {
        pipeline: 'agentic-v2-simplified',
        error: true,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});