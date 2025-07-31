import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para request de scoring
interface ScoringRequest {
  query: string;
  matches: Array<{
    content: string;
    similarity: number;
    document_id?: string;
    metadata?: any;
  }>;
  analysisResult?: {
    isConstructionQuery?: boolean;
    entities?: {
      neighborhoods?: string[];
      zots?: string[];
      articles?: string[];
    };
    intent?: string;
  };
}

// Interface para response de scoring
interface ScoringResponse {
  scoredMatches: Array<{
    content: string;
    originalSimilarity: number;
    contextualScore: number;
    finalScore: number;
    boosts: string[];
    penalties: string[];
    threshold: number;
    passesThreshold: boolean;
  }>;
  appliedThreshold: number;
  queryType: QueryType;
  totalProcessed: number;
  qualityMetrics: {
    averageScore: number;
    topScore: number;
    passedThreshold: number;
  };
}

// Enum para tipos de query
enum QueryType {
  CERTIFICATION_SUSTAINABILITY = 'certification_sustainability',
  FOURTH_DISTRICT_ART74 = 'fourth_district_art74',
  CONSTRUCTION_GENERIC = 'construction_generic',
  NEIGHBORHOOD_SPECIFIC = 'neighborhood_specific',
  GENERIC = 'generic',
  ARTICLE_SPECIFIC = 'article_specific'
}

// Configurações de scoring por tipo de query
const SCORING_CONFIG = {
  [QueryType.CERTIFICATION_SUSTAINABILITY]: {
    threshold: 0.2,
    boosts: {
      certification: 0.8,
      sustainability: 0.8,
      sustainable: 0.7,
      certificação: 0.8,
      sustentabilidade: 0.8,
      sustentável: 0.7,
      meio_ambiente: 0.6,
      verde: 0.5
    },
    penalties: {
      generic_terms: 0.7
    }
  },
  [QueryType.FOURTH_DISTRICT_ART74]: {
    threshold: 0.3,
    boosts: {
      'art. 74': 2.0,
      'artigo 74': 2.0,
      'quarto distrito': 2.0,
      '4º distrito': 2.0,
      'distrito 4': 2.0,
      'art 74': 1.8,
      'artigo_74': 1.8
    },
    penalties: {}
  },
  [QueryType.CONSTRUCTION_GENERIC]: {
    threshold: 0.15,
    boosts: {
      altura: 0.8,
      'altura máxima': 0.9,
      gabarito: 0.8,
      'gabarito máximo': 0.9,
      elevação: 0.7,
      'limite vertical': 0.7,
      'limite de altura': 0.8,
      'altura permitida': 0.8,
      'altura de edificação': 0.8,
      'altura de construção': 0.8,
      coeficiente: 0.6,
      aproveitamento: 0.5,
      zona: 0.4,
      zot: 0.4,
      construção: 0.5,
      edificação: 0.5
    },
    penalties: {
      generic_terms: 0.3
    }
  },
  [QueryType.NEIGHBORHOOD_SPECIFIC]: {
    threshold: 0.2,
    boosts: {
      bairro_specific: 0.7,
      construction_terms: 0.5
    },
    penalties: {}
  },
  [QueryType.ARTICLE_SPECIFIC]: {
    threshold: 0.25,
    boosts: {
      exact_article: 1.5,
      article_number: 1.0,
      inciso: 0.8,
      parágrafo: 0.7
    },
    penalties: {}
  },
  [QueryType.GENERIC]: {
    threshold: 0.15,
    boosts: {},
    penalties: {
      too_generic: 0.3
    }
  }
};

// Classificador de tipo de query
function classifyQuery(query: string, analysisResult?: any): QueryType {
  const queryLower = query.toLowerCase();
  
  // 1. Certificação + Sustentabilidade (prioridade alta)
  const certificationTerms = ['certificação', 'certificado', 'certification', 'sustentável', 'sustentabilidade', 'sustainability'];
  if (certificationTerms.some(term => queryLower.includes(term))) {
    return QueryType.CERTIFICATION_SUSTAINABILITY;
  }
  
  // 2. 4º distrito + Art. 74 (prioridade máxima)
  const fourthDistrictTerms = ['4º distrito', 'quarto distrito', 'distrito 4'];
  const art74Terms = ['art. 74', 'artigo 74', 'art 74', 'artigo_74'];
  if (fourthDistrictTerms.some(term => queryLower.includes(term)) || 
      art74Terms.some(term => queryLower.includes(term))) {
    return QueryType.FOURTH_DISTRICT_ART74;
  }
  
  // 3. Artigos específicos
  const articlePattern = /art\.?\s*\d+|artigo\s*\d+|inciso\s*[IVX]+|parágrafo\s*\d+/i;
  if (articlePattern.test(query)) {
    return QueryType.ARTICLE_SPECIFIC;
  }
  
  // 4. Bairros específicos
  if (analysisResult?.entities?.neighborhoods?.length > 0) {
    return QueryType.NEIGHBORHOOD_SPECIFIC;
  }
  
  // 5. Construção genérica (incluindo sinônimos de altura)
  const constructionTerms = [
    'altura', 'altura máxima', 'gabarito', 'gabarito máximo', 'elevação', 
    'limite vertical', 'limite de altura', 'altura permitida', 'altura de edificação',
    'coeficiente', 'aproveitamento', 'construção', 'edificação', 'zona', 'zot'
  ];
  if (constructionTerms.some(term => queryLower.includes(term))) {
    return QueryType.CONSTRUCTION_GENERIC;
  }
  
  // 6. Default: genérico
  return QueryType.GENERIC;
}

// Função principal de scoring contextual
function calculateContextualScore(
  match: any,
  query: string,
  queryType: QueryType,
  analysisResult?: any
): {
  contextualScore: number;
  boosts: string[];
  penalties: string[];
  threshold: number;
  passesThreshold: boolean;
} {
  const config = SCORING_CONFIG[queryType];
  const content = (match.content || '').toLowerCase();
  const queryLower = query.toLowerCase();
  
  let contextualScore = match.similarity || 0;
  const boosts: string[] = [];
  const penalties: string[] = [];
  
  // Aplicar boosts específicos do tipo de query
  Object.entries(config.boosts).forEach(([term, boost]) => {
    if (term === 'bairro_specific' && analysisResult?.entities?.neighborhoods) {
      // Boost específico para bairros
      analysisResult.entities.neighborhoods.forEach((neighborhood: string) => {
        if (content.includes(neighborhood.toLowerCase())) {
          contextualScore *= (1 + boost);
          boosts.push(`bairro_match:${neighborhood}`);
        }
      });
    } else if (term === 'construction_terms') {
      // Boost expandido para termos de construção (incluindo sinônimos de altura)
      const constructionTerms = [
        'altura', 'altura máxima', 'gabarito', 'gabarito máximo', 'elevação',
        'limite vertical', 'limite de altura', 'altura permitida',
        'coeficiente', 'aproveitamento'
      ];
      constructionTerms.forEach(cTerm => {
        if (content.includes(cTerm)) {
          contextualScore *= (1 + boost);
          boosts.push(`construction:${cTerm}`);
        }
      });
    } else if (term === 'exact_article') {
      // Boost para matches exatos de artigos
      const articlePattern = /art\.?\s*\d+|artigo\s*\d+/gi;
      const queryArticles = queryLower.match(articlePattern);
      const contentArticles = content.match(articlePattern);
      
      if (queryArticles && contentArticles) {
        const hasExactMatch = queryArticles.some(qArt => 
          contentArticles.some(cArt => 
            qArt.replace(/\s+/g, '').toLowerCase() === cArt.replace(/\s+/g, '').toLowerCase()
          )
        );
        
        if (hasExactMatch) {
          contextualScore *= (1 + boost);
          boosts.push('exact_article_match');
        }
      }
    } else if (content.includes(term.replace(/_/g, ' '))) {
      contextualScore *= (1 + boost);
      boosts.push(`term_boost:${term}`);
    }
  });
  
  // Aplicar penalizações
  Object.entries(config.penalties).forEach(([penaltyType, penalty]) => {
    if (penaltyType === 'generic_terms') {
      const genericTerms = ['plano', 'diretor', 'porto', 'alegre', 'lei'];
      const hasOnlyGeneric = genericTerms.some(term => queryLower.includes(term)) &&
        !queryLower.match(/\b(altura|coeficiente|zona|bairro|art\.|artigo)\b/);
      
      if (hasOnlyGeneric) {
        contextualScore *= penalty;
        penalties.push('generic_terms_penalty');
      }
    } else if (penaltyType === 'too_generic') {
      const words = queryLower.split(/\s+/).filter(w => w.length > 2);
      if (words.length <= 2) {
        contextualScore *= penalty;
        penalties.push('too_generic_penalty');
      }
    }
  });
  
  // Garantir que o score não exceda 1.0
  contextualScore = Math.min(contextualScore, 1.0);
  
  const passesThreshold = contextualScore >= config.threshold;
  
  return {
    contextualScore,
    boosts,
    penalties,
    threshold: config.threshold,
    passesThreshold
  };
}

// Handler principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, matches, analysisResult }: ScoringRequest = await req.json();
    
    console.log('🎯 Contextual Scoring started');
    console.log('📝 Query:', query);
    console.log('📊 Matches to score:', matches.length);
    
    // Classificar tipo de query
    const queryType = classifyQuery(query, analysisResult);
    console.log('🏷️ Query type classified as:', queryType);
    
    // Aplicar scoring contextual para cada match
    const scoredMatches = matches.map(match => {
      const scoring = calculateContextualScore(match, query, queryType, analysisResult);
      
      return {
        content: match.content,
        originalSimilarity: match.similarity || 0,
        contextualScore: scoring.contextualScore,
        finalScore: scoring.contextualScore, // Por enquanto, o score final é o contextual
        boosts: scoring.boosts,
        penalties: scoring.penalties,
        threshold: scoring.threshold,
        passesThreshold: scoring.passesThreshold,
        ...match // Preservar outros campos do match original
      };
    });
    
    // Ordenar por score final
    scoredMatches.sort((a, b) => b.finalScore - a.finalScore);
    
    // Calcular métricas de qualidade
    const passedThreshold = scoredMatches.filter(m => m.passesThreshold);
    const scores = scoredMatches.map(m => m.finalScore);
    
    const qualityMetrics = {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      topScore: Math.max(...scores),
      passedThreshold: passedThreshold.length
    };
    
    const response: ScoringResponse = {
      scoredMatches,
      appliedThreshold: SCORING_CONFIG[queryType].threshold,
      queryType,
      totalProcessed: matches.length,
      qualityMetrics
    };
    
    console.log('✅ Contextual scoring completed');
    console.log('📈 Quality metrics:', qualityMetrics);
    console.log('🎯 Passed threshold:', passedThreshold.length, '/', matches.length);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Contextual scoring error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      scoredMatches: [],
      appliedThreshold: 0.15,
      queryType: QueryType.GENERIC,
      totalProcessed: 0,
      qualityMetrics: {
        averageScore: 0,
        topScore: 0,
        passedThreshold: 0
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});