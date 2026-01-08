import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.3';
import { trackTokenUsage, logLLMMetrics } from "../_shared/token-tracker.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ Cliente Supabase com permissões de admin
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔑 Supabase client initialized with service role');

// Lista de palavras de teste/técnicas a serem excluídas das análises
const EXCLUDED_KEYWORDS = [
  'teste', 'test', 'agente', 'ios', 'android', 'windows', 'desktop', 'mobile',
  'safari', 'chrome', 'pd', 'pdpoa', 'pduap', 'lovable',
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'versão', 'versao', 'browser', 'firefox', 'edge'
];

// Helper para limpar texto (remoção de stop words e saudações)
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper para retry com exponential backoff
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY] Attempt ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Se for 502/503/504, tentar novamente
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        const errorText = await response.text();
        console.warn(`⚠️ [RETRY] Server error ${response.status} on attempt ${attempt}: ${errorText.substring(0, 200)}`);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ [RETRY] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
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

**IMPORTANTE - PALAVRAS A IGNORAR:**
- Saudações: oi, olá, bom dia, boa tarde, etc.
- Stop words comuns: de, para, com, o, a, etc.
- **Palavras de teste/técnicas: ${EXCLUDED_KEYWORDS.join(', ')}**
- Nomes de versões, browsers, sistemas operacionais
- Palavras que indicam testes internos

**FOQUE EXCLUSIVAMENTE EM:**
- Termos técnicos sobre planejamento urbano
- Tópicos de interesse real dos usuários
- Dúvidas e necessidades relacionadas ao PDUS/LUOS

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

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
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
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`AI analysis failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices[0].message.content;
    const analysis = JSON.parse(analysisText);

    // ✅ Track token usage
    const usage = aiResult.usage;
    if (usage) {
      await trackTokenUsage({
        model: 'gpt-4o-mini',
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        source: 'analyze-messages',
        messagePreview: `Analyzed ${messages.length} messages`,
      });

      await logLLMMetrics({
        modelName: 'gpt-4o-mini',
        provider: 'openai',
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        success: true,
        requestType: 'message-analysis',
      });
    }

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