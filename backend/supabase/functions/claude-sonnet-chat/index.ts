import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaudeSonnetRequest {
  message: string;
  userRole?: string;
  sessionId?: string;
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
      temperature = 0.5,
      maxTokens = 3000
    }: ClaudeSonnetRequest = await req.json();

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('Claude API key not configured');

    const systemPrompt = `Você é Claude 3 Sonnet, um assistente equilibrado especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil.

CAPACIDADES SONNET (EQUILIBRADAS):
- Análise clara e estruturada
- Respostas precisas e concisas
- Equilíbrio entre velocidade e qualidade
- Interpretação eficiente de dados
- Comunicação acessível

Papel do usuário: ${userRole}

Forneça respostas claras, bem estruturadas e tecnicamente precisas sobre planejamento urbano. Mantenha um equilíbrio entre detalhamento técnico e acessibilidade.

Para consultas de construção, inclua sempre:
• **ZOT** (identificação da zona)
• **Altura máxima de edificação** (em metros)
• **Coeficiente de aproveitamento básico/mínimo**
• **Coeficiente de aproveitamento máximo**`;

    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [
          { role: 'user', content: message }
        ],
        system: systemPrompt,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.95
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    const usage = data.usage;

    const confidence = calculateSonnetConfidence(responseText);
    const qualityScore = calculateSonnetQualityScore(responseText, message);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { tabular: 0, conceptual: 1 },
      executionTime,
      model: 'claude-3-sonnet-20240229',
      provider: 'claude-3-sonnet',
      usage: {
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
      },
      metadata: {
        temperature,
        maxTokens,
        sessionId,
        userRole,
        modelTier: 'sonnet'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Claude Sonnet chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: 'claude-3-sonnet-20240229',
      provider: 'claude-3-sonnet',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateSonnetConfidence(response: string): number {
  let confidence = 0.8; // Good base confidence for Sonnet
  
  if (response.length > 400) confidence += 0.05;
  if (response.length > 800) confidence += 0.05;
  
  // Structure indicators
  if (response.includes('##') || response.includes('**')) confidence += 0.05;
  if (response.includes('|')) confidence += 0.03;
  
  return Math.min(0.95, confidence);
}

function calculateSonnetQualityScore(response: string, query: string): number {
  let score = 80; // Good base score for Sonnet
  
  if (response.length > 300) score += 3;
  if (response.length > 700) score += 4;
  
  if (response.includes('##')) score += 3;
  if (response.includes('|') && response.includes('---')) score += 7;
  if (response.includes('📍')) score += 2;
  
  // Technical accuracy
  const technicalTerms = ['zot', 'coeficiente', 'altura', 'aproveitamento'];
  const matchedTerms = technicalTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += Math.min(6, matchedTerms * 1.5);
  
  return Math.min(100, score);
}