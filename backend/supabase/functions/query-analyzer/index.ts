import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  normalizeZoneName, 
  normalizeBairroName, 
  extractZoneTerms, 
  extractBairroTerms 
} from '../_shared/normalization.ts';

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
  intent: 'conceptual' | 'tabular' | 'hybrid' | 'predefined_objectives' | 'legal_article';
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
  needsRiskData?: boolean;
  queryType?: 'regime' | 'risk' | 'counting' | 'general' | 'legal_article';
  metadata?: {
    isLegalQuery?: boolean;
    requiresCitation?: boolean;
    expectedArticles?: string[];
    legalKeywords?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userRole, sessionId }: QueryAnalysisRequest = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

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

    // Detect legal/article queries FIRST (highest priority)
    const legalArticleMapping = [
      { pattern: /certificação.*sustentabilidade|sustentabilidade.*ambiental/i, articles: ['Art. 81, Inciso III'], law: 'LUOS' },
      { pattern: /4[º°]?\s*distrito|quarto\s+distrito/i, articles: ['Art. 74'], law: 'LUOS' },
      { pattern: /altura\s+máxima.*artigo|artigo.*altura\s+máxima/i, articles: ['Art. 81'], law: 'LUOS' },
      { pattern: /coeficiente.*aproveitamento.*artigo|artigo.*coeficiente/i, articles: ['Art. 82'], law: 'LUOS' },
      { pattern: /\bzeis\b.*artigo|artigo.*\bzeis\b/i, articles: ['Art. 92'], law: 'PDUS' },
      { pattern: /outorga\s+onerosa/i, articles: ['Art. 86'], law: 'LUOS' },
      { pattern: /estudo.*impacto.*vizinhança|\beiv\b/i, articles: ['Art. 89'], law: 'LUOS' },
      { pattern: /recuos?\s+obrigatórios?/i, articles: ['Art. 83'], law: 'LUOS' },
      { pattern: /áreas?\s+de\s+preservação\s+permanente/i, articles: ['Art. 95'], law: 'PDUS' },
      { pattern: /instrumentos.*política.*urbana/i, articles: ['Art. 78'], law: 'LUOS' }
    ];
    
    const generalLegalPatterns = [
      /\bartigo\s*\d+/i,
      /\bart\.?\s*\d+/i,
      /\binciso\s+[IVX]+/i,
      /\bparágrafo\s*\d+/i,
      /\b§\s*\d+/i,
      /\bluos\b/i,
      /\bpdus\b/i,
      /\blei\s+(complementar\s+)?n[º°]?\s*\d+/i,
      /qual\s+artigo/i,
      /que\s+artigo/i,
      /onde\s+está.*lei/i,
      /lei\s+que\s+trata/i
    ];
    
    const queryLower = (query || '').toString().toLowerCase();
    
    // Check for specific legal mappings
    const matchedMappings = legalArticleMapping.filter(mapping => 
      mapping.pattern.test(query)
    );
    
    // Check for general legal patterns
    const isLegalQuery = generalLegalPatterns.some(pattern => pattern.test(query)) || 
                        matchedMappings.length > 0;
    
    // If it's a legal query, return immediately with specific handling
    if (isLegalQuery) {
      console.log('🎯 Query legal detectada:', query);
      
      const expectedArticles = matchedMappings.flatMap(m => m.articles);
      const legalKeywords = matchedMappings.map(m => m.law);
      
      const legalResponse: QueryAnalysisResponse = {
        intent: 'legal_article',
        entities: {
          parametros: ['artigo', 'lei', 'luos', 'pdus']
        },
        requiredDatasets: ['document_sections'],
        confidence: 0.95,
        strategy: 'hybrid', // Use hybrid for legal queries to get both structured and unstructured data
        isConstructionQuery: false,
        queryType: 'legal_article',
        metadata: {
          isLegalQuery: true,
          requiresCitation: true,
          expectedArticles: expectedArticles.length > 0 ? expectedArticles : undefined,
          legalKeywords: legalKeywords.length > 0 ? legalKeywords : ['LUOS', 'PDUS']
        }
      };
      
      return new Response(JSON.stringify(legalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check for predefined objectives questions
    const objectivesKeywords = [
      'objetivos', 'objetivo', 'cinco principais', 'principais objetivos',
      'quais os objetivos', 'me fale sobre os objetivos', 'objetivos do plano diretor',
      'cinco principais objetivos', 'quais são os objetivos'
    ];
    
    // Continue with original detection logic
    // Comprehensive synonym arrays for urban parameters
    const coeficienteAproveitamentoTerms = [
      'coeficiente de aproveitamento', 'ca', 'índice de aproveitamento', 'potencial construtivo',
      'índice construtivo', 'aproveitamento', 'coeficiente', 'índice', 'ca máximo', 'ca mínimo'
    ];

    const taxaOcupacaoTerms = [
      'taxa de ocupação', 'índice de ocupação', 'to', 'ocupação', 'taxa máxima de ocupação'
    ];

    const alturaMaximaTerms = [
      'altura máxima', 'gabarito', 'limite de altura', 'altura', 'altura permitida',
      'elevação', 'elevação máxima', 'altura da edificação', 'altura do prédio', 
      'metros de altura', 'cota máxima', 'nível máximo', 'teto de altura',
      'altura da construção', 'height', 'gabarito máximo',
      'gabarito permitido', 'limite vertical', 'parâmetro de altura', 
      'restrição de altura', 'altura regulamentada', 'limite construtivo'
    ];

    const maximoTerms = [
      'maior', 'máximo', 'superior', 'teto', 'limite máximo', 'mais alto', 'mais alta', 'previsto', 'permitido',
      'autorizado', 'estabelecido', 'definido'
    ];
    
    // Detectar queries de altura máxima mais alta (query agregada)
    const isMaxHeightQuery = query.toLowerCase().includes('altura máxima mais alta') || 
                            (query.toLowerCase().includes('altura') && 
                             query.toLowerCase().includes('máxima') && 
                             query.toLowerCase().includes('mais alta')) ||
                            (query.toLowerCase().includes('altura') && 
                             query.toLowerCase().includes('máxima') && 
                             query.toLowerCase().includes('maior')) ||
                            (query.toLowerCase().includes('altura') && 
                             query.toLowerCase().includes('mais alta')) ||
                            (query.toLowerCase().includes('maior altura'));

    // Risk and disaster detection terms
    const riskKeywords = [
      'risco', 'riscos', 'inundação', 'inundacao', 'alagamento', 'enchente', 'cheia',
      'deslizamento', 'vendaval', 'granizo', 'desastre', 'desastres',
      'cota de inundação', 'cota', 'área de risco', 'zona de risco',
      'acima da cota', 'abaixo da cota', 'sujeito a inundação'
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
    
    // Detect risk/disaster queries FIRST
    const hasRiskTerms = riskKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );

    // Detect counting/aggregation queries 
    const hasCountingTerms = countingKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    const isCountingQuery = hasCountingTerms && (queryLower.includes('bairro') || queryLower.includes('zona') || queryLower.includes('zot'));
    const isRiskQuery = hasRiskTerms;
    
    // Check if query asks for neighborhood data (zones, parameters)
    const asksForNeighborhoodData = !isCountingQuery && !isMaxHeightQuery && (
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
      isMaxHeightQuery: isMaxHeightQuery,
      asksForNeighborhoodData: asksForNeighborhoodData,
      isConstructionQuery: isConstructionQuery,
      isRiskQuery: isRiskQuery,
      hasRiskTerms: hasRiskTerms
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
1º - Se contém "risco", "inundação", "cota", "alagamento", "desastre" → É QUERY DE RISCO (needsRiskData: true, queryType: 'risk')
2º - Se contém "Quantos", "Quantas", "Total de" → É CONTAGEM (isConstructionQuery: false, queryType: 'counting')
3º - Se pergunta sobre "altura máxima mais alta" ou "maior altura" → É AGREGAÇÃO (intent: tabular, isConstructionQuery: false)
4º - Se contém "construir", "edificar" + bairro/endereço → É CONSTRUÇÃO (isConstructionQuery: true, queryType: 'regime')  
5º - SE A QUERY É CURTA (1-3 palavras) E PARECE SER NOME DE BAIRRO → É CONSULTA DE BAIRRO (isConstructionQuery: true, queryType: 'regime')
6º - Outras análises

REGRA CRÍTICA PARA QUERIES CURTAS (SISTEMA UNIVERSAL):
- Qualquer nome isolado de 1-3 palavras → SEMPRE assumir que quer dados tabulares do bairro
- "três figueiras", "petrópolis", "cristal", "boa vista" → intent: tabular, isConstructionQuery: true
- TODOS os 94 bairros devem ter o mesmo tratamento, sem exceções hardcoded

REGRA ABSOLUTA SOBRE PORTO ALEGRE:
- "Porto Alegre" é o NOME DA CIDADE, NÃO é um bairro
- NUNCA adicione "PORTO ALEGRE" em entities.bairros
- Se a query menciona "em porto alegre" ou "de porto alegre", isso indica contexto da cidade
- Exemplos:
  * "altura máxima em porto alegre" → consulta GENÉRICA sobre a cidade (intent: conceptual)
  * "coeficiente de aproveitamento de porto alegre" → consulta GENÉRICA (intent: conceptual)
  * "o que posso construir em porto alegre" → consulta GERAL (intent: conceptual)

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

7. RISK/DISASTER QUERIES - PRIORITY MÁXIMA para detectar queries de risco:
   - "risco de inundação", "cota de inundação", "acima da cota" → needsRiskData: true, queryType: 'risk'
   - "bairros com risco", "quantos bairros acima da cota" → intent: "tabular", strategy: "structured_only"
   - "57 bairros acima da cota" → DEVE retornar dados da tabela bairros_risco_desastre
   - SEMPRE marque needsRiskData: true para essas queries
   - NUNCA confunda com queries de regime urbanístico

8. COUNTING/AGGREGATION QUERIES - Identifique se é uma pergunta de contagem:
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
            É uma consulta de risco/inundação: ${isRiskQuery}
            É uma consulta de altura máxima agregada: ${isMaxHeightQuery}
            Query é curta (possível nome de bairro): ${isShortQuery}
            
            REGRAS CRÍTICAS:
            1. Se isRiskQuery = true, SEMPRE defina:
               - needsRiskData: true
               - queryType: "risk"
               - strategy: "structured_only"
               - isConstructionQuery: false
            2. Se isCountingQuery = true, SEMPRE defina isConstructionQuery: false no JSON
            3. Se isMaxHeightQuery = true (altura máxima mais alta), SEMPRE:
               - intent: "tabular"
               - strategy: "structured_only" 
               - isConstructionQuery: false
               - requiredDatasets: ["17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk"]
            4. Se a query é CURTA (1-3 palavras) e NÃO é contagem, ASSUMA que é nome de bairro:
               - intent: "tabular" 
               - isConstructionQuery: true
               - requiredDatasets: DEVE incluir "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" e "1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY"
               - strategy: "structured_only"
            5. Para queries como "três figueiras", "petrópolis", "cristal":
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
              "isConstructionQuery": ${isConstructionQuery},
              "needsRiskData": ${isRiskQuery},
              "queryType": "${isRiskQuery ? 'risk' : isCountingQuery ? 'counting' : isConstructionQuery ? 'regime' : 'general'}"
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

    // PÓS-PROCESSAMENTO: Normalização e limpeza de entidades
    
    // 1. Normalizar nomes de zonas
    if (analysisResult.entities?.zots) {
      analysisResult.entities.zots = analysisResult.entities.zots.map(zot => {
        if (typeof zot === 'string') {
          return normalizeZoneName(zot);
        }
        return zot;
      });
      console.log('DEBUG - ZOTs normalizadas:', analysisResult.entities.zots);
    }
    
    // 2. Normalizar nomes de bairros
    if (analysisResult.entities?.bairros) {
      const originalBairros = [...analysisResult.entities.bairros];
      
      // Primeiro normaliza todos os bairros
      analysisResult.entities.bairros = analysisResult.entities.bairros.map(bairro => 
        normalizeBairroName(bairro)
      );
      
      // Depois remove "PORTO ALEGRE" (que é a cidade, não um bairro)
      analysisResult.entities.bairros = analysisResult.entities.bairros.filter(
        bairro => !bairro.includes('PORTO ALEGRE')
      );
      
      console.log('DEBUG - Bairros normalizados:', analysisResult.entities.bairros);
      
      if (originalBairros.length !== analysisResult.entities.bairros.length) {
        console.log('DEBUG - Removido "PORTO ALEGRE" da lista de bairros');
        
        // Se removemos Porto Alegre e não sobrou nenhum bairro, ajustar a análise
        if (analysisResult.entities.bairros.length === 0 && isConstructionQuery) {
          analysisResult.intent = 'conceptual';
          analysisResult.strategy = 'unstructured_only';
          analysisResult.isConstructionQuery = false;
          console.log('DEBUG - Ajustado para consulta conceitual após remover Porto Alegre');
        }
      }
    }
    
    // 3. Extração adicional de termos não detectados pelo GPT
    const zonesFromQuery = extractZoneTerms(query);
    const bairrosFromQuery = extractBairroTerms(query);
    
    if (zonesFromQuery.length > 0) {
      if (!analysisResult.entities) analysisResult.entities = {};
      if (!analysisResult.entities.zots) analysisResult.entities.zots = [];
      
      // Adiciona zonas encontradas que não estão na lista
      for (const zone of zonesFromQuery) {
        if (!analysisResult.entities.zots.includes(zone)) {
          analysisResult.entities.zots.push(zone);
        }
      }
      console.log('DEBUG - ZOTs adicionadas da extração:', zonesFromQuery);
    }
    
    if (bairrosFromQuery.length > 0) {
      if (!analysisResult.entities) analysisResult.entities = {};
      if (!analysisResult.entities.bairros) analysisResult.entities.bairros = [];
      
      // Adiciona bairros encontrados que não estão na lista
      for (const bairro of bairrosFromQuery) {
        const normalized = normalizeBairroName(bairro);
        if (!analysisResult.entities.bairros.includes(normalized) && !normalized.includes('PORTO ALEGRE')) {
          analysisResult.entities.bairros.push(normalized);
        }
      }
      console.log('DEBUG - Bairros adicionados da extração:', bairrosFromQuery);
    }

    // FORÇA a inclusão do dataset de regime urbanístico para consultas de construção
    if (isConstructionQuery && analysisResult.entities?.bairros?.length > 0) {
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