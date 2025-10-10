import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: secrets, error: secretsError } = await supabaseClient
      .from("secrets")
      .select("secret_value")
      .eq("name", "OPENAI_API_KEY")
      .single();

    if (secretsError || !secrets) {
      console.error('❌ OpenAI API Key not found in secrets');
      throw new Error("OpenAI API Key not configured");
    }

    const openaiApiKey = secrets.secret_value;

    // Call OpenAI API (blocking mode for initial test)
    console.log('🤖 Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agentConfig?.model || 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente útil. Responda de forma clara e concisa.' 
          },
          { role: 'user', content: message }
        ],
        temperature: agentConfig?.parameters?.temperature || 0.7,
        max_tokens: agentConfig?.parameters?.max_tokens || 500,
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
