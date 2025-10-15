import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ Cliente Supabase com permissões de admin
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔑 Supabase client initialized with service role');

// Helper para limpar texto (remoção de stop words e saudações)
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Receber array de objetos com session_id, user_message, created_at
    const { messages } = await req.json();
    
    console.log(`📊 [STEP 1] Received ${messages.length} messages for analysis`);
    console.log(`📊 [STEP 1] First message sample:`, JSON.stringify(messages[0]));
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('❌ [ERROR] OPENAI_API_KEY not configured');
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log('✅ [STEP 2] OpenAI API Key validated');

    // ✅ Pré-processar mensagens: limpar e normalizar
    const messageTexts = messages.map((m: any) => {
      const raw = m.user_message || m.content || m;
      return cleanText(raw);
    });
    
    console.log(`📊 [STEP 3] Extracted ${messageTexts.length} message texts`);

    const analysisPrompt = `Analise as seguintes mensagens de usuários e retorne um JSON com insights.

Para cada mensagem, identifique:
1. **sentiment**: "positive", "negative" ou "neutral"
2. **sentiment_score**: valor de 0 a 1 (0=muito negativo, 1=muito positivo)
3. **intent**: array de intenções (ex: ["buscar_informacao", "entender_regras"])
4. **topics**: array de tópicos (ex: ["LUOS", "zoneamento", "mobilidade"])
5. **keywords**: array das principais palavras-chave RELEVANTES

**IMPORTANTE:**
- IGNORE saudações (oi, olá, bom dia, boa tarde, coe, etc.)
- IGNORE stop words comuns (de, para, com, o, a, etc.)
- FOQUE em termos técnicos e relevantes sobre planejamento urbano
- Palavras-chave devem ter significado analítico real

Mensagens:
${messageTexts.map((m: string, i: number) => `${i + 1}. "${m}"`).join('\n')}

Retorne um JSON com estrutura:
{
  "results": [
    {
      "message_index": 0,
      "sentiment": "positive",
      "sentiment_score": 0.8,
      "intent": ["buscar_informacao"],
      "topics": ["LUOS"],
      "keywords": ["plano diretor", "zoneamento"]
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um analista especializado em processar feedback de usuários sobre planejamento urbano.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lovable AI error:', errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices[0].message.content;
    const analysis = JSON.parse(analysisText);

    console.log(`✅ [STEP 4] OpenAI analysis complete: ${analysis.results.length} results`);
    console.log(`📊 [STEP 4] Sample result:`, JSON.stringify(analysis.results[0]));

    // ✅ INSERIR INSIGHTS NO BANCO DE DADOS
    const insights = messages.map((msg: any, idx: number) => {
      const result = analysis.results[idx];
      return {
        session_id: msg.session_id,
        user_message: msg.user_message || msg.content || msg,
        sentiment: result?.sentiment || 'neutral',
        sentiment_score: result?.sentiment_score || 0.5,
        intent: result?.intent || [],
        topics: result?.topics || [],
        keywords: result?.keywords || [],
        created_at: msg.created_at || new Date().toISOString()
      };
    });

    console.log(`📊 [STEP 5] Prepared ${insights.length} insights for insertion`);
    console.log(`📊 [STEP 5] Sample insight:`, JSON.stringify(insights[0]));

    // ✅ UPSERT usando service_role (bypassa RLS)
    const { data: insertedData, error: insertError } = await supabase
      .from('message_insights')
      .upsert(insights, { 
        onConflict: 'session_id,user_message',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('❌ [STEP 6 ERROR] Database insert failed:', insertError);
      console.error('❌ [STEP 6 ERROR] Insert error details:', JSON.stringify(insertError));
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`✅ [STEP 6] Successfully inserted ${insights.length} insights into database`);
    console.log(`✅ [STEP 6] Inserted data sample:`, JSON.stringify(insertedData?.[0]));

    return new Response(JSON.stringify({ 
      success: true,
      analyzed: insights.length,
      results: analysis.results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [FATAL ERROR] Function failed:', error);
    console.error('❌ [FATAL ERROR] Error name:', error.name);
    console.error('❌ [FATAL ERROR] Error message:', error.message);
    console.error('❌ [FATAL ERROR] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        errorType: error.name 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});