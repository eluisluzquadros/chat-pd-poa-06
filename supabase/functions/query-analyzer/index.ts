import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryAnalysisRequest {
  query: string;
  userRole?: string;
  sessionId?: string;
}

interface QueryAnalysisResponse {
  intent: 'conceptual' | 'tabular' | 'hybrid' | 'predefined_objectives';
  entities: {
    zots?: string[];
    bairros?: string[];
    parametros?: string[];
  };
  requiredDatasets: string[];
  confidence: number;
  strategy: 'structured_only' | 'unstructured_only' | 'hybrid' | 'predefined';
  isConstructionQuery?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userRole, sessionId }: QueryAnalysisRequest = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OpenAI API key not configured');

    // Create Supabase client for getting secrets
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get OpenAI API key from secrets if not in env
    if (!openAIApiKey) {
      const { data: secrets } = await supabaseClient
        .from("secrets")
        .select("secret_value")
        .eq("name", "OPENAI_API_KEY")
        .single();
      
      if (!secrets?.secret_value) {
        throw new Error('OpenAI API key not found in secrets');
      }
    }

    // Check for predefined objectives questions first
    const objectivesKeywords = [
      'objetivos', 'objetivo', 'cinco principais', 'principais objetivos',
      'quais os objetivos', 'me fale sobre os objetivos', 'objetivos do plano diretor',
      'cinco principais objetivos', 'quais são os objetivos'
    ];
    
    // Check for construction-related questions
    const constructionKeywords = [
      'o que posso construir', 'posso construir', 'construir', 'edificar',
      'altura máxima', 'coeficiente de aproveitamento', 'regime urbanístico',
      'parâmetros construtivos', 'regras de construção', 'edificação'
    ];
    
    const queryLower = query.toLowerCase();
    const hasObjectivesKeyword = objectivesKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    
    const isConstructionQuery = constructionKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    ) && (queryLower.includes('bairro') || queryLower.includes('zot'));

    if (hasObjectivesKeyword) {
      const predefinedResult: QueryAnalysisResponse = {
        intent: 'predefined_objectives',
        entities: {},
        requiredDatasets: [],
        confidence: 1.0,
        strategy: 'predefined'
      };
      
      // Store analysis result for tracking
      if (sessionId) {
        await supabaseClient
          .from('agent_executions')
          .insert({
            session_id: sessionId,
            user_query: query,
            intent_classification: predefinedResult,
            created_at: new Date().toISOString()
          });
      }

      return new Response(JSON.stringify(predefinedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um analisador de consultas especializado no Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre.

Analise a consulta do usuário e determine:

1. INTENT - Tipo de informação necessária:
   - "conceptual": Informações conceituais/textuais sobre o plano diretor
   - "tabular": Dados específicos de tabelas (ZOTs, regimes, bairros)
   - "hybrid": Combinação de ambos

2. ENTITIES - Extraia entidades específicas com PRECISÃO:
   - ZOTs (ex: "ZOT 01", "ZOT 07", normalize para formato "ZOT XX")
   - Bairros (IMPORTANTE: diferencie "BOA VISTA" de "BOA VISTA DO SUL" - são bairros distintos)
   - Parâmetros urbanísticos (ex: "coeficiente de aproveitamento", "altura máxima")

3. REQUIRED_DATASETS - Quais datasets são necessários:
   - "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" para regime urbanístico
   - "1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY" para ZOTs vs Bairros

4. STRATEGY - Estratégia de processamento:
   - "structured_only": Apenas dados tabulares
   - "unstructured_only": Apenas documentos conceituais
   - "hybrid": Ambos necessários

5. CONSTRUCTION QUERIES - Identifique se é uma pergunta sobre construção:
   - Se contém palavras como "construir", "edificar" + menção a "bairro" ou "zot"
   - Marque como isConstructionQuery: true
   - SEMPRE solicite dataset de regime urbanístico para essas consultas

6. NORMALIZAÇÃO DE BAIRROS:
   - "Boa Vista" → "BOA VISTA"
   - "Boa Vista do Sul" → "BOA VISTA DO SUL"
   - Sempre em maiúsculas para correspondência exata
   - NÃO confunda bairros similares

Responda APENAS com JSON válido no formato especificado.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analise esta consulta: "${query}"

            Contexto do usuário: ${userRole || 'citizen'}
            É uma consulta sobre construção: ${isConstructionQuery}
            
            Responda com JSON válido seguindo exatamente esta estrutura:
            {
              "intent": "conceptual|tabular|hybrid",
              "entities": {
                "zots": ["lista de ZOTs encontradas"],
                "bairros": ["lista de bairros encontrados"], 
                "parametros": ["lista de parâmetros urbanísticos"]
              },
              "requiredDatasets": ["lista de dataset IDs necessários"],
              "confidence": 0.95,
              "strategy": "structured_only|unstructured_only|hybrid",
              "isConstructionQuery": ${isConstructionQuery}
            }`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    let analysisResult: QueryAnalysisResponse;

    try {
      analysisResult = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse analysis result:', parseError);
      analysisResult = {
        intent: 'hybrid',
        entities: {},
        requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'],
        confidence: 0.7,
        strategy: 'hybrid',
        isConstructionQuery
      };
    }

    // Store analysis result for tracking
    if (sessionId) {
      await supabaseClient
        .from('agent_executions')
        .insert({
          session_id: sessionId,
          user_query: query,
          intent_classification: analysisResult,
          created_at: new Date().toISOString()
        });
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Query analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
        fallback: {
          intent: 'hybrid',
          entities: {},
          requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'],
          confidence: 0.5,
          strategy: 'hybrid',
          isConstructionQuery: false
        }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});