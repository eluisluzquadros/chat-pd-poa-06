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
  needsClarification?: boolean;
  clarificationMessage?: string;
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
    
    // Comprehensive synonym arrays for urban parameters
    const coeficienteAproveitamentoTerms = [
      'coeficiente de aproveitamento', 'ca', 'índice de aproveitamento', 'potencial construtivo',
      'índice construtivo', 'aproveitamento', 'coeficiente', 'índice', 'ca máximo', 'ca mínimo'
    ];

    const taxaOcupacaoTerms = [
      'taxa de ocupação', 'índice de ocupação', 'to', 'ocupação', 'taxa máxima de ocupação'
    ];

    const alturaMaximaTerms = [
      'altura máxima', 'gabarito', 'limite de altura', 'altura', 'altura permitida'
    ];

    const maximoTerms = [
      'maior', 'máximo', 'superior', 'teto', 'limite máximo', 'mais alto', 'previsto', 'permitido',
      'autorizado', 'estabelecido', 'definido'
    ];

    // Enhanced construction detection - now includes specific neighborhood/ZOT queries
    const constructionKeywords = [
      'o que pode ser construído', 'o que posso construir', 'posso construir', 'construir', 'construído', 'edificar',
      ...coeficienteAproveitamentoTerms,
      ...taxaOcupacaoTerms,
      ...alturaMaximaTerms,
      'regime urbanístico', 'parâmetros construtivos', 'regras de construção', 'edificação',
      'parâmetros urbanísticos', 'índices urbanísticos', 'área construída', 'terreno', 'lote'
    ];
    
    // Counting and aggregation queries detection
    const countingKeywords = [
      'quantos', 'quantas', 'quantidade', 'total de', 'número de', 
      'lista', 'listar', 'liste', 'média', 'índice médio'
    ];
    
    // Enhanced bairro/ZOT detection
    const bairroZotPatterns = [
      /\bbairro\s+[a-záàâãéêíóôõúç\s]+/gi,
      /\bzot\s*\d+(\.\d+)?([abc])?/gi,
      /\bzona\s+de\s+ordenamento/gi
    ];
    
    const queryLower = query.toLowerCase();
    const hasObjectivesKeyword = objectivesKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    
    // Detect if query is short and might be just a neighborhood name
    const isShortQuery = query.trim().split(/\s+/).length <= 3;
    
    // Detect common patterns that indicate user wants neighborhood info
    const neighborhoodInfoPatterns = [
      /^[a-záàâãéêíóôõúç\s]+\.?$/i, // Just a name (possibly with period)
      /^bairro\s+[a-záàâãéêíóôõúç\s]+$/i, // "bairro X"
      /^[a-záàâãéêíóôõúç\s]+\s*\?$/i, // Name with question mark
      /^(o que|quais?|qual)\s+(é|são|tem|existe|há)\s+(em|no|na)\s+[a-záàâãéêíóôõúç\s]+\??$/i // "o que tem em X?"
    ];
    
    const mightBeNeighborhoodQuery = neighborhoodInfoPatterns.some(pattern => 
      pattern.test(query.trim())
    ) || isShortQuery;
    
    // More precise construction query detection
    const hasConstructionTerms = constructionKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    const hasBairroOrZot = bairroZotPatterns.some(pattern => pattern.test(query)) ||
                          queryLower.includes('bairro') || 
                          queryLower.includes('zot') ||
                          queryLower.includes('zona');
    
    // Detect counting/aggregation queries FIRST
    const hasCountingTerms = countingKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    const isCountingQuery = hasCountingTerms && (queryLower.includes('bairro') || queryLower.includes('zona') || queryLower.includes('zot'));
    
    // Check if query asks for neighborhood data (zones, parameters)
    const asksForNeighborhoodData = !isCountingQuery && (
      // Explicit construction queries
      (hasConstructionTerms && hasBairroOrZot) ||
      // Short queries that might be neighborhood names
      (mightBeNeighborhoodQuery && !hasObjectivesKeyword && !isCountingQuery) ||
      // Queries asking about zones/parameters
      (queryLower.includes('zona') || queryLower.includes('zot')) ||
      // Queries with urbanistic terms
      (queryLower.includes('regime') || queryLower.includes('urbanístico') || queryLower.includes('urbanistico')) ||
      // Queries asking about parameters
      (queryLower.includes('índice') || queryLower.includes('indice') || 
       queryLower.includes('coeficiente') || queryLower.includes('altura') ||
       queryLower.includes('potencial') || queryLower.includes('construtivo'))
    );
    
    // ONLY mark as construction if it's NOT a counting query
    const isConstructionQuery = asksForNeighborhoodData;

    console.log('DEBUG - Query analysis:', {
      originalQuery: query,
      queryLower: queryLower,
      isShortQuery: isShortQuery,
      mightBeNeighborhoodQuery: mightBeNeighborhoodQuery,
      hasConstructionTerms: hasConstructionTerms,
      hasBairroOrZot: hasBairroOrZot,
      isCountingQuery: isCountingQuery,
      asksForNeighborhoodData: asksForNeighborhoodData,
      isConstructionQuery: isConstructionQuery
    });

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

ORDEM DE ANÁLISE OBRIGATÓRIA:
1º - Se contém "Quantos", "Quantas", "Total de" → É CONTAGEM (isConstructionQuery: false)
2º - Se contém "construir", "edificar" + bairro/endereço → É CONSTRUÇÃO (isConstructionQuery: true)  
3º - SE A QUERY É CURTA (1-3 palavras) E PARECE SER NOME DE BAIRRO → É CONSULTA DE BAIRRO (isConstructionQuery: true)
4º - Outras análises

REGRA CRÍTICA PARA QUERIES CURTAS:
- "três figueiras" → DEVE retornar dados do bairro (intent: tabular, isConstructionQuery: true)
- "petrópolis." → DEVE retornar dados do bairro (intent: tabular, isConstructionQuery: true)
- "cristal" → DEVE retornar dados do bairro (intent: tabular, isConstructionQuery: true)
- Qualquer nome isolado que pode ser um bairro → SEMPRE assumir que quer dados tabulares

Analise a consulta do usuário e determine:

1. INTENT - Tipo de informação necessária:
   - "conceptual": Informações conceituais/textuais sobre o plano diretor
   - "tabular": Dados específicos de tabelas (ZOTs, regimes, bairros)
   - "hybrid": Combinação de ambos

2. ENTITIES - Extraia entidades específicas com PRECISÃO:
   - ZOTs (ex: "ZOT 01", "ZOT 07", normalize para formato "ZOT XX")
   - Bairros (IMPORTANTE: diferencie "BOA VISTA" de "BOA VISTA DO SUL" - são bairros distintos)
   - Parâmetros urbanísticos: reconheça todas estas variações equivalentes:
     * Coeficiente/CA/índice de aproveitamento/potencial construtivo/índice construtivo
     * Taxa/índice de ocupação/TO
     * Altura máxima/gabarito/limite de altura
     * Maior/máximo/superior/teto/limite máximo/previsto/permitido/autorizado

3. REQUIRED_DATASETS - Quais datasets são necessários:
   - "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" para regime urbanístico (OBRIGATÓRIO para consultas de construção)
   - "1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY" para ZOTs vs Bairros

4. STRATEGY - Estratégia de processamento:
   - "structured_only": Apenas dados tabulares
   - "unstructured_only": Apenas documentos conceituais
   - "hybrid": Ambos necessários

5. CONSTRUCTION QUERIES - Identifique se é uma pergunta sobre construção:
   - Se contém palavras como "construir", "edificar" + menção a "bairro" ou "zot"
   - Marque como isConstructionQuery: true
   - SEMPRE solicite dataset "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" para essas consultas
   - CRÍTICO: Dataset de regime urbanístico deve SEMPRE estar presente para consultas de construção

6. QUERIES CURTAS DE BAIRROS - REGRA ESPECIAL E CRÍTICA:
   - Queries de 1-3 palavras que parecem nomes de lugares SÃO consultas sobre bairros
   - Exemplos: "três figueiras", "petrópolis", "cristal", "boa vista"
   - SEMPRE trate como: intent: "tabular", isConstructionQuery: true
   - SEMPRE inclua os datasets de regime urbanístico e ZOTs vs Bairros
   - O usuário QUER ver as zonas e parâmetros urbanísticos do bairro

7. COUNTING/AGGREGATION QUERIES - Identifique PRIMEIRO se é uma pergunta de contagem:
   - "Quantos bairros tem..." → intent: "tabular", dataset: "1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY", isConstructionQuery: false
   - "Quantos", "Quantas", "Total de" → são consultas de CONTAGEM, NÃO de construção
   - "Lista de zonas..." → intent: "tabular"
   - "Média de..." → intent: "tabular"
   - SEMPRE use strategy: "structured_only" para consultas de contagem
   - NUNCA marque consultas de contagem como isConstructionQuery: true

8. NORMALIZAÇÃO DE BAIRROS:
   - "Boa Vista" → "BOA VISTA"
   - "Boa Vista do Sul" → "BOA VISTA DO SUL"
   - Sempre em maiúsculas para correspondência exata
   - NÃO confunda bairros similares

9. ENDEREÇOS SEM BAIRRO - Tratamento especial:
   - Se a pergunta menciona um endereço (rua, avenida) mas NÃO especifica o bairro
   - Marque como: needsClarification: true
   - Adicione: clarificationMessage: "Para informações precisas sobre construção, por favor informe o bairro onde está localizado o endereço."

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
            É uma consulta sobre construção/bairro: ${isConstructionQuery}
            É uma consulta de contagem/agregação: ${isCountingQuery}
            Query é curta (possível nome de bairro): ${isShortQuery}
            
            REGRAS CRÍTICAS:
            1. Se isCountingQuery = true, SEMPRE defina isConstructionQuery: false no JSON
            2. Se a query é CURTA (1-3 palavras) e NÃO é contagem, ASSUMA que é nome de bairro:
               - intent: "tabular" 
               - isConstructionQuery: true
               - requiredDatasets: DEVE incluir "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" e "1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY"
               - strategy: "structured_only"
            3. Para queries como "três figueiras", "petrópolis", "cristal":
               - Extraia o nome como bairro em entities.bairros
               - SEMPRE retorne dados tabulares do regime urbanístico
            
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

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error(`Invalid OpenAI response: ${JSON.stringify(data)}`);
    }
    
    let analysisResult: QueryAnalysisResponse;

    try {
      let contentToParse = data.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = contentToParse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        contentToParse = jsonMatch[1];
        console.log('DEBUG - Extracted JSON from markdown:', contentToParse);
      }
      
      analysisResult = JSON.parse(contentToParse);
      console.log('DEBUG - Successfully parsed JSON:', JSON.stringify(analysisResult, null, 2));
    } catch (parseError) {
      console.error('Failed to parse analysis result:', parseError, 'Raw content:', data.choices[0].message.content);
      
      // Enhanced fallback with construction detection
      analysisResult = {
        intent: isConstructionQuery ? 'tabular' : 'hybrid',
        entities: isConstructionQuery ? {
          parametros: ['altura', 'coeficiente de aproveitamento', 'zona']
        } : {},
        requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'],
        confidence: 0.7,
        strategy: isConstructionQuery ? 'structured_only' : 'hybrid',
        isConstructionQuery
      };
      console.log('DEBUG - Used enhanced fallback:', JSON.stringify(analysisResult, null, 2));
    }

    // FORÇA a inclusão do dataset de regime urbanístico para consultas de construção
    if (isConstructionQuery) {
      const regimeDataset = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk';
      if (!analysisResult.requiredDatasets) {
        analysisResult.requiredDatasets = [];
      }
      if (!analysisResult.requiredDatasets.includes(regimeDataset)) {
        analysisResult.requiredDatasets.unshift(regimeDataset); // Adiciona no início da lista
        console.log('DEBUG - Forçou inclusão do dataset de regime urbanístico');
      }
      analysisResult.strategy = 'structured_only'; // Força estratégia estruturada
      console.log('DEBUG - Datasets após forçar regime:', analysisResult.requiredDatasets);
    }

    // Enhanced ZOT detection and subdivision handling with improved logging
    console.log('DEBUG - Original ZOTs detected:', analysisResult.entities?.zots);
    
    if (analysisResult.entities && analysisResult.entities.zots) {
      analysisResult.entities.zots = analysisResult.entities.zots.map(zot => {
        // Detect ZOTs with subdivisions (like ZOT 08.3 which has A, B, C)
        const hasSubdivisions = /ZOT\s*\d+\.\d+$/i.test(zot);
        console.log(`DEBUG - ZOT "${zot}" has subdivisions:`, hasSubdivisions);
        
        if (hasSubdivisions) {
          return {
            code: zot,
            hasSubdivisions: true,
            requiresAllSubdivisions: true,
            note: "Esta ZOT possui subdivisões (A, B, C) com parâmetros diferentes - TODAS devem ser consultadas"
          };
        }
        return zot;
      });
    }
    
    // Mark queries that need comprehensive subdivision data
    const hasSubdivisionQuery = analysisResult.entities?.zots?.some(zot => 
      typeof zot === 'object' && zot.hasSubdivisions
    );
    
    if (hasSubdivisionQuery) {
      analysisResult.processingStrategy = "comprehensive_subdivision_query";
      analysisResult.requiresAllSubdivisions = true;
      analysisResult.note = "Query requires ALL subdivision data (A, B, C) for complete response";
      console.log('DEBUG - Marked as comprehensive subdivision query');
    }
    
    // Additional validation for column name consistency
    analysisResult.validationRules = {
      exactColumnNames: {
        altura: "Altura Máxima - Edificação Isolada",
        caBasico: "Coeficiente de Aproveitamento - Básico", 
        caMaximo: "Coeficiente de Aproveitamento - Máximo",
        zona: "Zona"
      },
      subdivisionHandling: {
        detectSubdivisions: true,
        requireAllSubdivisions: hasSubdivisionQuery,
        sortByZone: true
      }
    };
    
    console.log('DEBUG - Final analysis result:', JSON.stringify(analysisResult, null, 2));

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