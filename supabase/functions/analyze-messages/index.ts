import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`📊 Analyzing ${messages.length} messages...`);

    const analysisPrompt = `Analise as seguintes mensagens de usuários e retorne um JSON com insights.

Para cada mensagem, identifique:
1. **sentiment**: "positive", "negative" ou "neutral"
2. **sentiment_score**: valor de 0 a 1 (0=muito negativo, 1=muito positivo)
3. **intent**: array de intenções (ex: ["buscar_informacao", "entender_regras"])
4. **topics**: array de tópicos (ex: ["LUOS", "zoneamento", "mobilidade"])
5. **keywords**: array das principais palavras-chave

Mensagens:
${messages.map((m: string, i: number) => `${i + 1}. "${m}"`).join('\n')}

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um analista especializado em processar feedback de usuários sobre planejamento urbano.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: "json_object" }
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

    console.log(`✅ Analysis complete for ${analysis.results.length} messages`);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-messages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});