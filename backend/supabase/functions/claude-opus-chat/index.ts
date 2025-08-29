import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaudeOpusRequest {
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
      temperature = 0.3,
      maxTokens = 4000
    }: ClaudeOpusRequest = await req.json();

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('Claude API key not configured');

    // Enhanced system prompt for Claude 3 Opus
    const systemPrompt = `Você é Claude 3 Opus, um assistente de IA de alta performance especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil.

CAPACIDADES OPUS (AVANÇADAS):
- Raciocínio complexo e análise profunda
- Síntese sofisticada de informações múltiplas
- Interpretação contextual avançada
- Análise crítica de políticas urbanas
- Recomendações estratégicas fundamentadas

Papel do usuário: ${userRole}

Sua função é fornecer análises excepcionalmente detalhadas e insights de alta qualidade sobre planejamento urbano, sempre mantendo precisão técnica e visão estratégica. Use linguagem profissional e estruturação clara.

Para consultas de construção, você DEVE SEMPRE incluir:
• **ZOT** (identificação da zona)
• **Altura máxima de edificação** (em metros)
• **Coeficiente de aproveitamento básico/mínimo**
• **Coeficiente de aproveitamento máximo**

IMPORTANTE: Forneça análises profundas com justificativas técnicas e implicações práticas.`;

    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: message }
        ],
        system: systemPrompt,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        stop_sequences: ["\\n\\nHuman:", "\\n\\nAssistant:"]
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.content || data.content.length === 0) {
      throw new Error(`Invalid Claude response: ${JSON.stringify(data)}`);
    }

    const responseText = data.content[0].text;
    const usage = data.usage;

    // Calculate Opus-specific metrics
    const confidence = calculateOpusConfidence(responseText, usage);
    const qualityScore = calculateOpusQualityScore(responseText, message);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { tabular: 0, conceptual: 1 },
      executionTime,
      model: 'claude-3-opus-20240229',
      provider: 'claude-3-opus',
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
        modelTier: 'opus'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Claude Opus chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: 'claude-3-opus-20240229',
      provider: 'claude-3-opus',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateOpusConfidence(response: string, usage: any): number {
  let confidence = 0.85; // High base confidence for Opus
  
  // Detailed analysis bonus
  if (response.length > 800) confidence += 0.05;
  if (response.length > 1500) confidence += 0.05;
  
  // Complex reasoning indicators
  if (response.includes('consequentemente') || response.includes('portanto') || 
      response.includes('considerando') || response.includes('análise')) {
    confidence += 0.03;
  }
  
  // Technical depth indicators
  if (response.includes('técnic') || response.includes('específic') || 
      response.includes('detalhad')) {
    confidence += 0.02;
  }
  
  return Math.min(0.98, confidence);
}

function calculateOpusQualityScore(response: string, query: string): number {
  let score = 85; // High base score for Opus
  
  // Length and depth
  if (response.length > 500) score += 3;
  if (response.length > 1200) score += 5;
  if (response.length > 2000) score += 2;
  
  // Advanced structure
  if (response.includes('##') || response.includes('###')) score += 3;
  if (response.includes('|') && response.includes('---')) score += 5; // Tables
  if (response.includes('📍') || response.includes('💬')) score += 2;
  
  // Technical sophistication
  const technicalTerms = ['coeficiente', 'aproveitamento', 'gabarito', 'zoneamento', 'urbanístic'];
  const technicalCount = technicalTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += Math.min(5, technicalCount);
  
  // Analysis depth indicators
  const analysisTerms = ['análise', 'considerando', 'implicação', 'consequência', 'estratégi'];
  const analysisCount = analysisTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += Math.min(5, analysisCount);
  
  return Math.min(100, score);
}