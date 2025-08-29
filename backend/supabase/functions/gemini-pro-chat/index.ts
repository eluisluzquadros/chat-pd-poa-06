import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiProRequest {
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
      temperature = 0.6,
      maxTokens = 4000
    }: GeminiProRequest = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('Gemini API key not configured');

    const systemPrompt = `Você é Gemini 1.5 Pro, um assistente de IA avançado especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil.

CAPACIDADES GEMINI PRO:
- Processamento multimodal avançado
- Análise contextual profunda
- Raciocínio lógico estruturado
- Síntese de informações complexas
- Respostas tecnicamente precisas

Papel do usuário: ${userRole}

Forneça análises detalhadas e tecnicamente precisas sobre planejamento urbano. Use estruturação clara e linguagem acessível mantendo rigor técnico.

Para consultas de construção, você DEVE SEMPRE incluir:
• **ZOT** (identificação da zona)
• **Altura máxima de edificação** (em metros)
• **Coeficiente de aproveitamento básico/mínimo**
• **Coeficiente de aproveitamento máximo**

IMPORTANTE: Mantenha precisão técnica e forneça contexto relevante para cada resposta.`;

    const startTime = Date.now();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.8,
            topK: 40,
            stopSequences: []
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    );

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(`Invalid Gemini response: ${JSON.stringify(data)}`);
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const usage = data.usageMetadata;

    // Calculate Gemini Pro specific metrics
    const confidence = calculateGeminiProConfidence(responseText, usage);
    const qualityScore = calculateGeminiProQualityScore(responseText, message);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { tabular: 0, conceptual: 1 },
      executionTime,
      model: 'gemini-1.5-pro',
      provider: 'gemini-pro',
      usage: {
        promptTokens: usage?.promptTokenCount || 0,
        candidatesTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0
      },
      metadata: {
        temperature,
        maxTokens,
        sessionId,
        userRole,
        modelTier: 'pro',
        multimodal: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gemini Pro chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      model: 'gemini-1.5-pro',
      provider: 'gemini-pro',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateGeminiProConfidence(response: string, usage: any): number {
  let confidence = 0.82; // High base confidence for Gemini Pro
  
  // Detail and length bonus
  if (response.length > 600) confidence += 0.04;
  if (response.length > 1200) confidence += 0.04;
  
  // Technical depth indicators
  if (response.includes('específicamente') || response.includes('detalhadamente') || 
      response.includes('tecnicamente')) {
    confidence += 0.03;
  }
  
  // Structured content
  if (response.includes('##') || response.includes('###')) confidence += 0.04;
  if (response.includes('|') && response.includes('---')) confidence += 0.05;
  
  // Context awareness
  if (response.includes('PDUS') || response.includes('Porto Alegre') || 
      response.includes('planejamento urbano')) {
    confidence += 0.02;
  }
  
  return Math.min(0.96, confidence);
}

function calculateGeminiProQualityScore(response: string, query: string): number {
  let score = 82; // High base score for Gemini Pro
  
  // Length and completeness
  if (response.length > 400) score += 3;
  if (response.length > 900) score += 4;
  if (response.length > 1500) score += 3;
  
  // Advanced formatting
  if (response.includes('##') || response.includes('###')) score += 3;
  if (response.includes('|') && response.includes('---')) score += 6; // Tables
  if (response.includes('📍') || response.includes('💬')) score += 2;
  if (response.includes('**') && response.includes('•')) score += 2; // Rich formatting
  
  // Technical sophistication
  const technicalTerms = ['zoneamento', 'coeficiente', 'aproveitamento', 'gabarito', 'urbanístic', 'territorial'];
  const technicalCount = technicalTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += Math.min(6, technicalCount);
  
  // Contextual relevance
  const contextTerms = ['PDUS', 'Porto Alegre', 'plano diretor', 'sustentável'];
  const contextCount = contextTerms.filter(term => 
    response.toLowerCase().includes(term.toLowerCase())
  ).length;
  score += Math.min(4, contextCount);
  
  // Query relevance
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const responseText = response.toLowerCase();
  const relevantMatches = queryWords.filter(word => responseText.includes(word)).length;
  score += Math.min(6, relevantMatches);
  
  return Math.min(100, score);
}