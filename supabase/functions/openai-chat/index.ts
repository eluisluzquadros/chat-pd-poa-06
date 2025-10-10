import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retrieveContext } from "../chat/services/rag-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get OpenAI API Key from Supabase secrets
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Read from vault.decrypted_secrets (encrypted at rest)
    const { data: secrets, error: secretsError } = await supabaseClient
      .from("decrypted_secrets")
      .select("name, decrypted_secret")
      .eq("name", "OPENAI_API_KEY")
      .single();

    if (secretsError || !secrets) {
      console.error('❌ OpenAI API Key not found in vault');
      throw new Error("OpenAI API Key not configured in Vault");
    }

    const openaiApiKey = secrets.decrypted_secret;

    // Check if RAG is enabled for this agent
    const indexId = agentConfig?.api_config?.llamacloud_index_id;
    
    // Get LLAMACLOUD_API_KEY from vault if RAG is enabled
    let llamacloudApiKey: string | undefined;
    if (indexId) {
      const { data: llamaSecret, error: llamaError } = await supabaseClient
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "LLAMACLOUD_API_KEY")
        .single();
      
      if (!llamaError && llamaSecret) {
        llamacloudApiKey = llamaSecret.decrypted_secret;
      } else {
        console.warn('⚠️ RAG enabled but LLAMACLOUD_API_KEY not found in vault');
      }
    }

    // Prepare system prompt and user message
    let systemPrompt = 'Você é um assistente útil. Responda de forma clara e concisa.';
    let userMessage = message;

    // If RAG is configured, retrieve context
    if (indexId && llamacloudApiKey) {
      console.log('🔍 RAG Mode enabled for agent:', agentConfig?.name);
      
      try {
        const context = await retrieveContext(message, indexId, llamacloudApiKey);
        
        if (context) {
          systemPrompt = `Você é um assistente especializado. Use APENAS as informações do contexto abaixo para responder.

CONTEXTO DA BASE DE CONHECIMENTO:
${context}

INSTRUÇÕES IMPORTANTES:
- Cite as fontes usando [1], [2], etc. conforme aparecem no contexto
- Se a informação não estiver no contexto, diga: "Não encontrei informações sobre isso na base de conhecimento."
- Seja preciso e baseie-se apenas no contexto fornecido
- Responda em português de forma clara e objetiva`;
          
          userMessage = `PERGUNTA DO USUÁRIO: ${message}`;
          
          console.log('✅ RAG context injected into prompt');
        } else {
          console.log('⚠️ No context retrieved from RAG');
        }
      } catch (ragError) {
        console.error('❌ RAG retrieval failed:', ragError);
        // Continue without RAG if it fails
      }
    }

    // Call OpenAI API with potentially enriched context
    console.log('🤖 Calling OpenAI API...', { 
      model: agentConfig?.model || 'gpt-4o-mini',
      ragEnabled: !!(indexId && llamacloudApiKey)
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
          { role: 'user', content: userMessage }
        ],
        temperature: indexId ? 0.3 : (agentConfig?.parameters?.temperature || 0.7),
        max_tokens: agentConfig?.parameters?.max_tokens || 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API Error:', openaiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('✅ [OpenAI Chat] Response generated', { 
      responseLength: assistantMessage?.length,
      model: data.model,
      usage: data.usage 
    });

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
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('🔥 [OpenAI Chat] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
