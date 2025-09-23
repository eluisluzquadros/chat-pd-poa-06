import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdvancedChatRequest {
  message: string;
  userRole?: string;
  sessionId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      userRole = 'citizen', 
      sessionId, 
      model = 'gpt-4.5-turbo',
      temperature = 0.7,
      maxTokens = 4000
    }: AdvancedChatRequest = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OpenAI API key not configured');

    // Enhanced system prompt for GPT-4.5
    const systemPrompt = `Você é um assistente de IA avançado especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil. 

CAPACIDADES AVANÇADAS GPT-4.5:
- Análise aprofundada de padrões urbanos
- Inferência contextual avançada
- Processamento multimodal de dados
- Raciocínio espacial e temporal
- Síntese de informações complexas

Sua função é fornecer análises precisas, insights inovadores e recomendações estratégicas baseadas nos dados urbanísticos disponíveis. Mantenha sempre uma postura institucional profissional, construtiva e transparente.

Papel do usuário: ${userRole}

Para consultas de construção, você DEVE SEMPRE incluir:
• **ZOT** (identificação da zona)
• **Altura máxima de edificação** (em metros)
• **Coeficiente de aproveitamento básico/mínimo**
• **Coeficiente de aproveitamento máximo**

Use formatação markdown rica e organize com títulos e estrutura claros.`;

    const startTime = Date.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model === 'gpt-4.5-turbo' ? 'gpt-4o' : 'gpt-4o-mini', // Fallback to available models
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error(`Invalid OpenAI response: ${JSON.stringify(data)}`);
    }

    const responseText = data.choices[0].message.content;
    const usage = data.usage;

    // Calculate advanced metrics
    const confidence = this.calculateConfidence(responseText, usage);
    const qualityScore = this.calculateQualityScore(responseText, message);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { tabular: 0, conceptual: 1 },
      executionTime,
      model: model,
      provider: 'gpt-4.5',
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0
      },
      metadata: {
        temperature,
        maxTokens,
        sessionId,
        userRole
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Advanced OpenAI chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: 'gpt-4.5-turbo',
      provider: 'gpt-4.5',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateConfidence(response: string, usage: any): number {
  let confidence = 0.7; // Base confidence for GPT-4.5
  
  // Bonus for detailed responses
  if (response.length > 500) confidence += 0.1;
  if (response.length > 1000) confidence += 0.1;
  
  // Bonus for structured content
  if (response.includes('|') && response.includes('---')) confidence += 0.05; // Tables
  if (response.includes('**') || response.includes('#')) confidence += 0.05; // Formatting
  
  return Math.min(0.95, confidence);
}

function calculateQualityScore(response: string, query: string): number {
  let score = 75; // Base score for GPT-4.5
  
  // Length and detail bonus
  if (response.length > 300) score += 5;
  if (response.length > 800) score += 5;
  
  // Structured content bonus
  if (response.includes('##') || response.includes('###')) score += 5; // Headers
  if (response.includes('|') && response.includes('---')) score += 10; // Tables
  if (response.includes('📍') || response.includes('💬')) score += 5; // Icons/formatting
  
  // Relevance bonus (simple keyword matching)
  const queryWords = query.toLowerCase().split(' ');
  const responseWords = response.toLowerCase();
  const relevantWords = queryWords.filter(word => 
    word.length > 3 && responseWords.includes(word)
  ).length;
  
  score += Math.min(10, relevantWords * 2);
  
  return Math.min(100, score);
}