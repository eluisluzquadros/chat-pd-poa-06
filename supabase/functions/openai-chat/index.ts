import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackTokenUsage, logLLMMetrics } from "../_shared/token-tracker.ts";

// Context retrieval is now handled by retrieve-context edge function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_UNAVAILABLE_MESSAGE = `⚠️ **Instabilidade Temporária no ChatPDPOA**

Pedimos desculpas. No momento, o ChatPDPOA está passando por uma instabilidade devido a um alto volume de acessos.

Nossa equipe técnica já foi acionada e está trabalhando para normalizar o serviço o mais rápido possível.

**Enquanto isso, você pode consultar:**

🗺️ **Mapa Interativo (Painel do Regime Urbanístico):**  
https://bit.ly/pdpoaregramento

📧 **Dúvidas Oficiais:**  
planodiretor@portoalegre.rs.gov.br

💬 **Contribuições (SMAMUS):**  
Envie suas sugestões pelos canais oficiais da SMAMUS.

Agradecemos a sua compreensão.`;

// Create Supabase client for internal operations (retrieve-context + chat_history)
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, userId, agentConfig } = await req.json();
    
    console.log('📱 [OpenAI Chat] Request received', { 
      messageLength: message?.length, 
      sessionId, 
      userId,
      agentModel: agentConfig?.model 
    });

    // Get OpenAI API Key from Edge Function Secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      throw new Error("OPENAI_API_KEY not configured in Edge Function Secrets");
    }

    console.log('✅ OpenAI API Key loaded from environment');

    // Prepare system prompt and user message
    let systemPrompt = agentConfig?.parameters?.system_prompt || 
                       'Você é um assistente útil. Responda de forma clara e concisa.';
    let contextSources = [];

    // Check if agent has knowledge bases configured via new system
    if (agentConfig?.id) {
      console.log('🔍 Retrieving context via retrieve-context edge function');
      try {
        const contextResponse = await supabaseClient.functions.invoke('retrieve-context', {
          body: { 
            agentId: agentConfig.id, 
            query: message 
          }
        });

        if (contextResponse.data?.context && contextResponse.data?.resultsCount > 0) {
          const { context, sources, resultsCount } = contextResponse.data;
          console.log(`✅ Retrieved ${resultsCount} results from knowledge bases`);
          
          // Combinar system prompt original + contexto RAG (não sobrescrever)
          systemPrompt = `${systemPrompt}

IMPORTANTE: Use as informações da base de conhecimento abaixo para responder:

CONTEXTO DA BASE DE CONHECIMENTO:
${context}

INSTRUÇÕES DE USO DO CONTEXTO:
- Priorize as informações do contexto acima
- Cite as fontes usando [1], [2], etc. conforme aparecem no contexto
- Se a informação não estiver no contexto, diga: "Não encontrei informações sobre isso na base de conhecimento."
- Seja preciso e baseie-se no contexto fornecido`;

          contextSources = sources;
        } else if (contextResponse.error || !contextResponse.data?.resultsCount) {
          console.warn('⚠️ RAG unavailable or empty, proceeding without context:', {
            error: contextResponse.error,
            resultsCount: contextResponse.data?.resultsCount || 0,
            agentId: agentConfig.id,
            kbCount: agentConfig.knowledge_bases?.length || 0,
          });
          console.log(`⚠️ [RAG] Agente "${agentConfig.name}" não obteve contexto - verifique bases de conhecimento`);
        }
      } catch (error) {
        console.error('⚠️ Error calling retrieve-context:', error);
      }
    }

    // Call OpenAI API with potentially enriched context
    console.log('🤖 Calling OpenAI API...', { 
      model: agentConfig?.model || 'gpt-4o-mini',
      hasContext: contextSources.length > 0
    });
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agentConfig?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: contextSources.length > 0 ? 0.3 : (agentConfig?.parameters?.temperature || 0.7),
        max_tokens: agentConfig?.parameters?.max_tokens || 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      
      // ✅ Log técnico detalhado
      console.error('❌ OpenAI API Error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorText
      });
      
      // ✅ SEMPRE retornar mensagem amigável (não propagar erro)
      return new Response(
        JSON.stringify({
          answer: SYSTEM_UNAVAILABLE_MESSAGE,
          model: "system",
          usage: {},
          sources: [],
          metadata: {
            isError: true,
            errorType: openaiResponse.status === 429 ? "rate_limit" : 
                       openaiResponse.status === 402 ? "quota_exceeded" : "api_error"
          }
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200 // ✅ Status 200 com mensagem amigável
        }
      );
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('✅ [OpenAI Chat] Response generated', { 
      responseLength: assistantMessage?.length,
      model: data.model,
      usage: data.usage 
    });

    // ✅ Track token usage
    const usage = data.usage;
    if (usage) {
      await trackTokenUsage({
        userId: userId,
        sessionId: sessionId,
        model: data.model || agentConfig?.model || 'gpt-4o-mini',
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        source: 'openai-chat',
        messagePreview: message.substring(0, 100),
      });

      await logLLMMetrics({
        modelName: data.model || agentConfig?.model || 'gpt-4o-mini',
        provider: 'openai',
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        success: true,
        requestType: 'chat',
        sessionId: sessionId,
        userId: userId,
        metadata: { 
          agentName: agentConfig?.name,
          hasContext: contextSources.length > 0,
        },
      });
    }

    // Save to chat_history
    const { error: saveError } = await supabaseClient
      .from('chat_history')
      .insert([
        {
          session_id: sessionId,
          user_id: userId,
          message: { role: 'user', content: message },
          metadata: { agent_name: agentConfig?.name || 'openai-test' }
        },
        {
          session_id: sessionId,
          user_id: userId,
          message: { role: 'assistant', content: assistantMessage },
          metadata: {
            agent_name: agentConfig?.name || 'openai-test',
            model: data.model,
            usage: data.usage,
          }
        }
      ]);

    if (saveError) {
      console.error('⚠️ Failed to save chat history:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        answer: assistantMessage,
        model: data.model,
        usage: data.usage,
        sources: contextSources,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    // ✅ Log técnico apenas no servidor
    console.error('🔥 [OpenAI Chat] Technical error:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // ✅ SEMPRE retornar mensagem amigável
    return new Response(
      JSON.stringify({ 
        answer: SYSTEM_UNAVAILABLE_MESSAGE,
        model: "system",
        usage: {},
        sources: [],
        metadata: {
          isError: true,
          errorType: "service_unavailable"
        }
      }),
      { 
        status: 200, // ✅ Status 200 com mensagem amigável
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
