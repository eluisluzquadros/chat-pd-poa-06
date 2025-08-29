import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaudeHaikuRequest {
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
      temperature = 0.7,
      maxTokens = 2000
    }: ClaudeHaikuRequest = await req.json();

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('Claude API key not configured');

    const systemPrompt = `Você é Claude 3 Haiku, um assistente rápido e eficiente especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil.

CAPACIDADES HAIKU (RÁPIDAS):
- Respostas diretas e objetivas
- Processamento ultrarrápido
- Informações essenciais focadas
- Comunicação clara e concisa
- Eficiência máxima

Papel do usuário: ${userRole}

Forneça respostas diretas, objetivas e tecnicamente corretas sobre planejamento urbano. Priorize clareza e concisão sem perder precisão.

Para consultas de construção, inclua:
• **ZOT** • **Altura máxima** • **CA básico** • **CA máximo**`;

    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [
          { role: 'user', content: message }
        ],
        system: systemPrompt,
        temperature,
        max_tokens: maxTokens,
        top_p: 1.0
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

    const confidence = calculateHaikuConfidence(responseText, executionTime);
    const qualityScore = calculateHaikuQualityScore(responseText, message);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { tabular: 0, conceptual: 1 },
      executionTime,
      model: 'claude-3-haiku-20240307',
      provider: 'claude-3-haiku',
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
        modelTier: 'haiku',
        speedOptimized: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Claude Haiku chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: 'claude-3-haiku-20240307',
      provider: 'claude-3-haiku',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateHaikuConfidence(response: string, executionTime: number): number {
  let confidence = 0.75; // Base confidence for Haiku
  
  // Speed bonus (Haiku's strength)
  if (executionTime < 1000) confidence += 0.1;
  if (executionTime < 500) confidence += 0.05;
  
  // Conciseness quality (shorter is better for Haiku)
  if (response.length < 800 && response.length > 100) confidence += 0.05;
  
  // Structure indicators
  if (response.includes('**') || response.includes('•')) confidence += 0.03;
  
  return Math.min(0.93, confidence);
}

function calculateHaikuQualityScore(response: string, query: string): number {
  let score = 75; // Base score for Haiku
  
  // Efficiency bonus (concise but complete)
  if (response.length > 150 && response.length < 600) score += 5;
  if (response.length > 600 && response.length < 1000) score += 3;
  
  // Essential information coverage
  if (response.includes('**')) score += 3; // Bold formatting
  if (response.includes('•')) score += 2; // Bullet points
  if (response.includes('ZOT') || response.includes('zot')) score += 5;
  
  // Technical accuracy
  const essentialTerms = ['altura', 'coeficiente', 'aproveitamento'];
  const matchedTerms = essentialTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += matchedTerms * 3;
  
  // Relevance to query
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const responseText = response.toLowerCase();
  const relevantMatches = queryWords.filter(word => responseText.includes(word)).length;
  score += Math.min(8, relevantMatches * 1.5);
  
  return Math.min(100, score);
}