import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCacheMiddleware, CacheUtils } from "../shared/cache-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VectorSearchRequest {
  message: string;
  userRole?: string;
  context?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userRole, context }: VectorSearchRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Check if this is a legal/article query
    const legalPatterns = [
      /\bartigo\s*\d+/i,
      /\bart\.?\s*\d+/i,
      /certificação.*sustentabilidade/i,
      /4[º°]?\s*distrito/i,
      /\bluos\b/i,
      /outorga\s+onerosa/i,
      /\bzeis\b/i,
      /estudo.*impacto.*vizinhança/i
    ];
    
    const isLegalQuery = legalPatterns.some(p => p.test(message));
    console.log('🔍 Vector search - Legal query?', isLegalQuery, 'Message:', message.substring(0, 100));

    // Initialize cache middleware for vector search
    const cacheMiddleware = createCacheMiddleware(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        defaultTTL: 15 * 60 * 1000, // 15 minutes for vector search
        enableVectorSearchCache: true,
        enableMetrics: true,
        cacheKeyPrefix: 'pdpoa_vector'
      }
    );

    // For legal queries, enhance the search terms
    let enhancedMessage = message;
    
    if (isLegalQuery) {
      // Add legal-specific search terms
      const legalEnhancements = [];
      
      if (message.toLowerCase().includes('certificação') || message.toLowerCase().includes('sustentabilidade')) {
        legalEnhancements.push('artigo 81', 'inciso III', 'certificação sustentabilidade ambiental', 'acréscimos');
      }
      
      if (message.toLowerCase().includes('4') && message.toLowerCase().includes('distrito')) {
        legalEnhancements.push('artigo 74', 'ZOT 8.2', 'quarto distrito', '4º distrito', 'revitalização');
      }
      
      if (message.toLowerCase().includes('outorga')) {
        legalEnhancements.push('artigo 86', 'outorga onerosa', 'direito de construir', 'contrapartida');
      }
      
      if (message.toLowerCase().includes('zeis')) {
        legalEnhancements.push('artigo 92', 'zonas especiais interesse social', 'habitação', 'regularização');
      }
      
      if (legalEnhancements.length > 0) {
        enhancedMessage = `${message} ${legalEnhancements.join(' ')}`;
        console.log('📚 Legal query enhanced:', enhancedMessage);
      }
    }
    
    // Implementa busca fuzzy melhorada e expandida para queries de altura
    const alturaKeywords = ['altura', 'gabarito', 'elevação', 'height', 'metros', 'limite de altura', 'limite vertical'];
    const messageContainsAltura = alturaKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Busca fuzzy para variações de escrita (implementação robusta)
    const queryLower = message.toLowerCase();
    const fuzzyHeightPatterns = [
      { pattern: /alturas?/i, synonyms: ['altura', 'gabarito', 'elevação', 'limite vertical'] },
      { pattern: /gabaritos?/i, synonyms: ['gabarito', 'altura', 'limite', 'elevação'] },
      { pattern: /eleva[\u00e7c][\u00e3a]o/i, synonyms: ['elevação', 'altura', 'gabarito', 'cota'] },
      { pattern: /limites?.*vertical/i, synonyms: ['limite vertical', 'altura', 'gabarito'] },
      { pattern: /limites?.*altura/i, synonyms: ['limite de altura', 'altura máxima', 'gabarito'] }
    ];
    
    let fuzzyMatched = false;
    fuzzyHeightPatterns.forEach(({ pattern, synonyms }) => {
      if (pattern.test(queryLower) && !fuzzyMatched) {
        console.log(`🔍 Fuzzy match encontrado: ${pattern} → adicionando sinônimos:`, synonyms);
        enhancedMessage += ' ' + synonyms.join(' ');
        fuzzyMatched = true;
      }
    });
    
    if (messageContainsAltura || fuzzyMatched) {
      console.log('🎯 Detectada query sobre altura - aplicando busca expandida');
      const alturaSynonyms = [
        'altura máxima', 'gabarito máximo', 'limite de altura', 'elevação máxima',
        'metros de altura', 'cota máxima', 'nível máximo', 'altura da construção',
        'altura do prédio', 'altura da edificação', 'teto de altura',
        'altura permitida', 'gabarito permitido', 'limite construtivo',
        'parâmetro de altura', 'restrição de altura', 'altura regulamentada'
      ];
      
      if (!fuzzyMatched) { // Evita duplicação se já foi processado pelo fuzzy
        enhancedMessage += ' ' + alturaSynonyms.join(' ');
      }
      
      console.log('📝 Query final expandida para busca:', enhancedMessage.substring(0, 200) + '...');
    }

    // Generate embedding for the enhanced query
    const { data: embeddingData, error: embeddingError } = await supabaseClient.functions.invoke('generate-text-embedding', {
      body: { 
        text: enhancedMessage,
        model: "text-embedding-3-small"
      }
    });

    if (embeddingError) {
      console.error('❌ Embedding generation failed:', embeddingError);
      throw new Error(`Embedding generation failed: ${embeddingError.message}`);
    }

    if (!embeddingData?.embedding) {
      console.error('❌ Invalid embedding response:', embeddingData);
      throw new Error('Invalid embedding response - no embedding data received');
    }

    // Get relevant documents based on user role
    let documentQuery = supabaseClient
      .from('documents')
      .select('id, title, file_name');

    // Filter by user role if specified
    if (userRole === 'citizen') {
      documentQuery = documentQuery.eq('is_public', true);
    }

    const { data: documents, error: docsError } = await documentQuery;

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!documents?.length) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documentIds = documents.map(doc => doc.id.toString());

    // Cache the vector search operation using optimized hierarchical search
    const vectorSearchResult = await cacheMiddleware.cacheVectorSearch(
      enhancedMessage,
      { userRole, documentIds, context },
      async () => {
        // Try optimized hierarchical search first
        let matches: any[] = [];
        let searchError: any = null;
        
        try {
          const { data: hierarchicalMatches, error: hierarchicalError } = await supabaseClient.rpc('match_hierarchical_documents_optimized', {
            query_embedding: embeddingData.embedding,
            match_count: 10,
            document_ids: documentIds,
            query_text: enhancedMessage,
            enable_cache: true,
            performance_mode: 'balanced'
          });

          if (hierarchicalError) {
            console.warn('⚠️ Hierarchical search failed, falling back to standard search:', hierarchicalError);
            searchError = hierarchicalError;
          } else {
            matches = hierarchicalMatches || [];
            console.log('🎯 Using optimized hierarchical search with', matches.length, 'results');
          }
        } catch (hierarchicalException) {
          console.warn('⚠️ Hierarchical search exception, falling back:', hierarchicalException);
          searchError = hierarchicalException;
        }

        // Fallback to standard search if hierarchical fails
        if (!matches.length && searchError) {
          console.log('🔄 Falling back to standard match_documents');
          const { data: standardMatches, error: standardError } = await supabaseClient.rpc('match_documents', {
            query_embedding: embeddingData.embedding,
            match_count: 10,
            document_ids: documentIds
          });

          if (standardError) {
            console.error('❌ Standard search also failed:', standardError);
            return { matches: [] };
          }
          
          matches = standardMatches || [];
        }

        return { matches };
      }
    );

    const matches = vectorSearchResult.matches;

    // Log cache performance for vector search
    const cacheMetrics = cacheMiddleware.getCacheMetrics();
    if (vectorSearchResult.fromCache) {
      console.log(`🎯 Vector search cache HIT for: ${message.substring(0, 50)}...`);
    }
    CacheUtils.logCachePerformance(cacheMetrics, 'enhanced-vector-search');

    // Apply contextual scoring using the new scoring service
    let enhancedMatches = matches || [];
    
    try {
      // Call contextual scoring service
      const scoringResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/contextual-scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          query: message,
          matches: enhancedMatches.map(match => ({
            content: match.content || match.content_chunk || '',
            similarity: match.similarity || 0,
            document_id: match.document_id,
            metadata: match.metadata
          })),
          analysisResult: {
            entities: {
              neighborhoods: context?.bairros || [],
              zots: context?.zots || []
            }
          }
        }),
      });

      if (scoringResponse.ok) {
        const scoringResult = await scoringResponse.json();
        
        console.log('🎯 Contextual scoring applied');
        console.log('📊 Query type:', scoringResult.queryType);
        console.log('🎚️ Applied threshold:', scoringResult.appliedThreshold);
        console.log('📈 Quality metrics:', scoringResult.qualityMetrics);
        
        // Use contextually scored matches
        enhancedMatches = scoringResult.scoredMatches.map((scoredMatch: any) => ({
          ...scoredMatch,
          similarity: scoredMatch.finalScore,
          contextual_boost_info: {
            original_similarity: scoredMatch.originalSimilarity,
            contextual_score: scoredMatch.contextualScore,
            boosts: scoredMatch.boosts,
            penalties: scoredMatch.penalties,
            threshold: scoredMatch.threshold,
            passes_threshold: scoredMatch.passesThreshold
          }
        }));
        
        // Filter by threshold
        enhancedMatches = enhancedMatches.filter((match: any) => 
          match.contextual_boost_info?.passes_threshold ?? true
        );
        
      } else {
        console.log('⚠️ Contextual scoring failed, using fallback');
        // Fallback to original PDUS-based scoring
        const pdusKeywords = [
          'zot', 'zona', 'regime urbanístico', 'coeficiente', 'altura',
          'bairro', 'porto alegre', 'plano diretor', 'pdus', 'sustentável'
        ];

        enhancedMatches = enhancedMatches.map((match: any) => {
          let boostedScore = match.similarity || 0;
          
          const content = (match.content || match.content_chunk || '').toLowerCase();
          
          // Boost score for PDUS-relevant content
          pdusKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
              boostedScore += 0.1;
            }
          });

          // Additional boost for entity matches from context
          if (context?.zots) {
            context.zots.forEach((zot: string) => {
              if (content.includes(zot.toLowerCase())) {
                boostedScore += 0.2;
              }
            });
          }

          if (context?.bairros) {
            context.bairros.forEach((bairro: string) => {
              if (content.includes(bairro.toLowerCase())) {
                boostedScore += 0.15;
              }
            });
          }

          return {
            ...match,
            similarity: Math.min(boostedScore, 1.0), // Cap at 1.0
            boosted: boostedScore > (match.similarity || 0)
          };
        });
      }
    } catch (scoringError) {
      console.error('❌ Contextual scoring error, using fallback:', scoringError);
      // Use original scoring as fallback
    }

    // Sort by enhanced similarity score
    enhancedMatches.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    // Take top results - use dynamic count based on quality
    const qualityCount = enhancedMatches.filter(m => m.similarity > 0.3).length;
    const resultCount = Math.max(3, Math.min(qualityCount, 8));
    const topMatches = enhancedMatches.slice(0, resultCount);

    // Add hierarchical search info to metadata with performance metrics
    const searchMetadata = {
      total_matches: enhancedMatches.length,
      applied_boost: true,
      search_type: 'optimized_hierarchical_vector',
      result_count: topMatches.length,
      quality_threshold: 0.3,
      // Extract performance metrics from first result if available
      performance_metrics: topMatches.length > 0 && topMatches[0].performance_metrics 
        ? topMatches[0].performance_metrics 
        : null
    };
    
    // Log optimized hierarchical results with performance info
    if (topMatches.length > 0) {
      console.log('🚀 Optimized hierarchical search results:');
      
      // Log performance metrics if available
      const perfMetrics = topMatches[0].performance_metrics;
      if (perfMetrics) {
        console.log(`⚡ Performance: ${perfMetrics.query_time_ms}ms, Cache: ${perfMetrics.cache_hit ? 'HIT' : 'MISS'}, Mode: ${perfMetrics.performance_mode}`);
        console.log(`📊 Candidates: ${perfMetrics.total_candidates}, Filtered: ${perfMetrics.filtered_results}`);
      }
      
      // Log top results with boost information
      topMatches.slice(0, 3).forEach((match: any, idx: number) => {
        const meta = match.chunk_metadata;
        const boostApplied = match.boosted_score > match.similarity;
        const boostRatio = perfMetrics?.boost_ratio || (match.boosted_score / match.similarity).toFixed(2);
        
        console.log(`  ${idx + 1}. Score: ${match.similarity.toFixed(3)} → ${match.boosted_score.toFixed(3)} ${boostApplied ? `(boost ${boostRatio}x)` : ''}`);
        if (meta) {
          console.log(`     Type: ${meta.type || 'N/A'}, Article: ${meta.articleNumber || 'N/A'}, Inciso: ${meta.incisoNumber || 'N/A'}`);
          console.log(`     Keywords: ${(meta.keywords || []).join(', ')}`);
        }
      });
    }

    return new Response(JSON.stringify({
      matches: topMatches,
      total: enhancedMatches.length,
      query: message,
      context: context,
      metadata: {
        ...searchMetadata,
        fromCache: vectorSearchResult.fromCache,
        cacheMetrics: {
          hitRate: (cacheMetrics.hitRate * 100).toFixed(1) + '%',
          totalEntries: cacheMetrics.totalEntries
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced vector search error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      matches: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});