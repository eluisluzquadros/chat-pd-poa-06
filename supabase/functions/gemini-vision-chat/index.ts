import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiVisionRequest {
  message: string;
  userRole?: string;
  sessionId?: string;
  temperature?: number;
  maxTokens?: number;
  imageData?: string; // Base64 encoded image
  imageType?: string; // mime type
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
      temperature = 0.4,
      maxTokens = 3000,
      imageData,
      imageType = 'image/jpeg'
    }: GeminiVisionRequest = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('Gemini API key not configured');

    const systemPrompt = `Você é Gemini 1.5 Pro Vision, um assistente de IA multimodal especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre, Brasil.

CAPACIDADES GEMINI PRO VISION:
- Análise visual de mapas, plantas e documentos
- Interpretação de imagens urbanísticas
- Processamento multimodal (texto + imagem)
- Identificação de elementos urbanos visuais
- Correlação visual-textual avançada

Papel do usuário: ${userRole}

${imageData ? 'IMPORTANTE: Analise cuidadosamente a imagem fornecida junto com a consulta. Identifique elementos relevantes como zonas, construções, mapas ou documentos urbanísticos.' : ''}

Para consultas de construção, inclua sempre:
• **ZOT** (identificação da zona)
• **Altura máxima de edificação** (em metros)
• **Coeficiente de aproveitamento básico/mínimo**
• **Coeficiente de aproveitamento máximo**

Se houver imagem, descreva elementos visuais relevantes encontrados.`;

    const startTime = Date.now();

    // Prepare content parts (text + optional image)
    const contentParts: any[] = [{ text: `${systemPrompt}\n\nUsuário: ${message}` }];
    
    if (imageData) {
      contentParts.push({
        inline_data: {
          mime_type: imageType,
          data: imageData
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: contentParts
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.8,
            topK: 32
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
      throw new Error(`Gemini Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(`Invalid Gemini Vision response: ${JSON.stringify(data)}`);
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const usage = data.usageMetadata;

    // Calculate Vision-specific metrics
    const confidence = calculateVisionConfidence(responseText, !!imageData, usage);
    const qualityScore = calculateVisionQualityScore(responseText, message, !!imageData);

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      qualityScore,
      sources: { 
        tabular: 0, 
        conceptual: 1,
        visual: imageData ? 1 : 0
      },
      executionTime,
      model: 'gemini-1.5-pro-vision',
      provider: 'gemini-pro-vision',
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
        modelTier: 'pro-vision',
        multimodal: true,
        hasImage: !!imageData,
        imageType: imageData ? imageType : null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gemini Vision chat error:', error);
    
    return new Response(JSON.stringify({
      response: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
      confidence: 0.1,
      qualityScore: 0,
      sources: { tabular: 0, conceptual: 0, visual: 0 },
      executionTime: 0,
      model: 'gemini-1.5-pro-vision',
      provider: 'gemini-pro-vision',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateVisionConfidence(response: string, hasImage: boolean, usage: any): number {
  let confidence = 0.78; // Base confidence for Vision model
  
  // Image processing bonus
  if (hasImage) {
    confidence += 0.08; // Significant bonus for multimodal processing
    
    // Visual description indicators
    if (response.includes('imagem') || response.includes('visual') || 
        response.includes('mostra') || response.includes('vejo')) {
      confidence += 0.05;
    }
    
    // Specific visual elements
    if (response.includes('mapa') || response.includes('planta') || 
        response.includes('documento') || response.includes('figura')) {
      confidence += 0.04;
    }
  }
  
  // Detail and structure
  if (response.length > 500) confidence += 0.03;
  if (response.includes('##') || response.includes('**')) confidence += 0.02;
  
  return Math.min(0.94, confidence);
}

function calculateVisionQualityScore(response: string, query: string, hasImage: boolean): number {
  let score = 78; // Base score for Vision model
  
  // Multimodal bonus
  if (hasImage) {
    score += 8; // Significant bonus for image processing
    
    // Visual analysis quality
    const visualTerms = ['imagem', 'visual', 'mostra', 'vejo', 'observo', 'identifico'];
    const visualCount = visualTerms.filter(term => 
      response.toLowerCase().includes(term)
    ).length;
    score += Math.min(6, visualCount * 2);
    
    // Technical visual analysis
    const technicalVisualTerms = ['mapa', 'planta', 'documento', 'figura', 'esquema', 'layout'];
    const techVisualCount = technicalVisualTerms.filter(term => 
      response.toLowerCase().includes(term)
    ).length;
    score += Math.min(5, techVisualCount * 2.5);
  }
  
  // General quality indicators
  if (response.length > 400) score += 3;
  if (response.length > 800) score += 4;
  
  // Structure and formatting
  if (response.includes('##')) score += 3;
  if (response.includes('|') && response.includes('---')) score += 5;
  if (response.includes('**') && response.includes('•')) score += 3;
  
  // Technical accuracy
  const technicalTerms = ['zot', 'coeficiente', 'altura', 'aproveitamento', 'zoneamento'];
  const techCount = technicalTerms.filter(term => 
    response.toLowerCase().includes(term)
  ).length;
  score += Math.min(5, techCount);
  
  // Query relevance
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const responseText = response.toLowerCase();
  const relevantMatches = queryWords.filter(word => responseText.includes(word)).length;
  score += Math.min(5, relevantMatches);
  
  return Math.min(100, score);
}