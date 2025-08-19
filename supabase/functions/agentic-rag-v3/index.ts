import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// FASE 3 - ADVANCED OPTIMIZATIONS
// Context Window Management, Fallback Strategies, Quality Scoring
// Target: <3s response time with robust fallbacks
// ============================================================

// TOKEN COUNTER - Context Window Management
class TokenCounter {
  // Approximate token count (1 token ≈ 4 characters for Portuguese)
  static countTokens(text: string): number {
    if (!text) return 0;
    // More accurate estimation for Portuguese text
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.ceil(chars / 3.5); // Adjusted for Portuguese
  }

  static limitContext(contexts: string[], maxTokens: number = 3000): string[] {
    const limitedContexts: string[] = [];
    let totalTokens = 0;
    
    for (const context of contexts) {
      const tokens = this.countTokens(context);
      if (totalTokens + tokens <= maxTokens) {
        limitedContexts.push(context);
        totalTokens += tokens;
      } else {
        // Try to fit a truncated version
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) { // Only if meaningful space left
          const truncatedChars = Math.floor(remainingTokens * 3.5);
          const truncated = context.substring(0, truncatedChars) + "...";
          limitedContexts.push(truncated);
        }
        break;
      }
    }
    
    console.log(`🎯 Context window: ${totalTokens}/${maxTokens} tokens (${limitedContexts.length}/${contexts.length} contexts)`);
    return limitedContexts;
  }
}

// QUALITY SCORING SYSTEM
class QualityScorer {
  static calculateQualityScore(response: string, query: string, results: any[], metadata: any): number {
    let score = 0;
    const maxScore = 1.0;
    
    // 1. RELEVANCE SCORE (0-0.3)
    const relevanceScore = this.calculateRelevanceScore(response, query, metadata);
    score += relevanceScore * 0.3;
    
    // 2. COMPLETENESS SCORE (0-0.3)  
    const completenessScore = this.calculateCompletenessScore(response, results, metadata);
    score += completenessScore * 0.3;
    
    // 3. ACCURACY SCORE (0-0.2)
    const accuracyScore = this.calculateAccuracyScore(response, results, metadata);
    score += accuracyScore * 0.2;
    
    // 4. CLARITY SCORE (0-0.2)
    const clarityScore = this.calculateClarityScore(response);
    score += clarityScore * 0.2;
    
    const finalScore = Math.min(maxScore, Math.max(0, score));
    
    console.log(`📊 Quality Score: ${finalScore.toFixed(3)} (R:${relevanceScore.toFixed(2)} C:${completenessScore.toFixed(2)} A:${accuracyScore.toFixed(2)} CL:${clarityScore.toFixed(2)})`);
    return finalScore;
  }
  
  private static calculateRelevanceScore(response: string, query: string, metadata: any): number {
    let score = 0;
    const lowerResponse = response.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Check for key terms from query
    const queryTerms = lowerQuery.split(/\s+/).filter(term => term.length > 3);
    const matchedTerms = queryTerms.filter(term => lowerResponse.includes(term));
    score += (matchedTerms.length / Math.max(queryTerms.length, 1)) * 0.5;
    
    // Check for specific elements mentioned
    if (metadata.article_number && lowerResponse.includes(`art`)) score += 0.2;
    if (metadata.zot_number && lowerResponse.includes(`zot`)) score += 0.2;
    if (metadata.neighborhood && lowerResponse.includes(metadata.neighborhood.toLowerCase())) score += 0.2;
    if (metadata.transitional_provisions && lowerResponse.includes('transitór')) score += 0.3;
    
    // Check for construction parameters
    if (metadata.construction_params) {
      const paramMatches = metadata.construction_params.filter((param: string) => 
        lowerResponse.includes(param.toLowerCase())
      );
      score += (paramMatches.length / metadata.construction_params.length) * 0.3;
    }
    
    return Math.min(1.0, score);
  }
  
  private static calculateCompletenessScore(response: string, results: any[], metadata: any): number {
    let score = 0;
    
    // Base completeness based on response length
    const responseLength = response.length;
    if (responseLength > 100) score += 0.3;
    if (responseLength > 300) score += 0.2;
    if (responseLength > 500) score += 0.2;
    
    // Check if response covers expected elements
    const lowerResponse = response.toLowerCase();
    
    // Article queries should mention specific articles
    if (metadata.article_number || metadata.article_numbers) {
      if (lowerResponse.includes('artigo') || lowerResponse.includes('art.')) score += 0.2;
    }
    
    // Multiple articles should be structured
    if (metadata.is_multiple_articles || metadata.is_article_range) {
      if (lowerResponse.includes('artigos') || response.split('Art.').length > 2) score += 0.2;
    }
    
    // ZOT queries should mention zoning information
    if (metadata.zot_number || metadata.construction_params) {
      if (lowerResponse.includes('zot') || lowerResponse.includes('zona')) score += 0.15;
      if (lowerResponse.includes('altura') || lowerResponse.includes('coeficiente')) score += 0.15;
    }
    
    // Check for sources reference
    if (response.includes('Fontes consultadas') || response.includes('📚')) score += 0.1;
    
    return Math.min(1.0, score);
  }
  
  private static calculateAccuracyScore(response: string, results: any[], metadata: any): number {
    let score = 0.7; // Base accuracy assumption
    
    // Check for common accuracy indicators
    const lowerResponse = response.toLowerCase();
    
    // Positive indicators
    if (results && results.length > 0) {
      score += 0.2; // Has source data
      
      // Check if specific numbers match (when applicable)
      if (metadata.article_number) {
        if (response.includes(metadata.article_number.toString())) score += 0.1;
      }
      
      if (metadata.zot_number) {
        if (response.includes(metadata.zot_number.toString())) score += 0.1;
      }
    }
    
    // Negative indicators (uncertainty language)
    if (lowerResponse.includes('não tenho certeza') || 
        lowerResponse.includes('pode ser') ||
        lowerResponse.includes('talvez')) {
      score -= 0.2;
    }
    
    // Check for disclaimers (good practice, slight bonus)
    if (lowerResponse.includes('baseado no contexto') || 
        lowerResponse.includes('conforme as informações')) {
      score += 0.05;
    }
    
    return Math.min(1.0, Math.max(0, score));
  }
  
  private static calculateClarityScore(response: string): number {
    let score = 0;
    
    // Response structure indicators
    const sentences = response.split(/[.!?]/).filter(s => s.trim().length > 10);
    if (sentences.length >= 2 && sentences.length <= 8) score += 0.3; // Good structure
    
    // Check for clear organization
    if (response.includes('\n') || response.includes('- ')) score += 0.2; // Has formatting
    if (response.includes('📚') || response.includes('Fontes')) score += 0.1; // Has sources
    
    // Avoid very long or very short responses
    const length = response.length;
    if (length >= 150 && length <= 800) score += 0.2;
    if (length < 50) score -= 0.3;
    if (length > 1000) score -= 0.2;
    
    // Professional language indicators
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('conforme') || 
        lowerResponse.includes('estabelece') ||
        lowerResponse.includes('determina')) {
      score += 0.2; // Professional terminology
    }
    
    return Math.min(1.0, Math.max(0, score));
  }
}

// FALLBACK STRATEGIES SYSTEM
class FallbackManager {
  constructor(private supabase: any) {}
  
  async executeFallbackStrategies(originalQuery: string, metadata: any, originalResults: any[]): Promise<any[]> {
    console.log('🔄 Executing fallback strategies for empty/poor results...');
    
    const fallbackResults: any[] = [];
    
    // Strategy 1: Broader search with reduced filters
    const broaderResults = await this.executeBroaderSearch(originalQuery, metadata);
    if (broaderResults && broaderResults.length > 0) {
      fallbackResults.push(...broaderResults);
    }
    
    // Strategy 2: Query decomposition
    const decomposedResults = await this.executeDecomposedSearch(originalQuery, metadata);
    if (decomposedResults && decomposedResults.length > 0) {
      fallbackResults.push(...decomposedResults);
    }
    
    // Strategy 3: Semantic similarity search
    const semanticResults = await this.executeSemanticSearch(originalQuery);
    if (semanticResults && semanticResults.length > 0) {
      fallbackResults.push(...semanticResults);
    }
    
    // Strategy 4: Generate query alternatives
    const alternativeQueries = this.generateAlternativeQueries(originalQuery, metadata);
    console.log('💡 Alternative queries suggested:', alternativeQueries.slice(0, 3));
    
    return fallbackResults;
  }
  
  private async executeBroaderSearch(query: string, metadata: any): Promise<any[]> {
    console.log('🔍 Fallback: Broader search...');
    
    const results: any[] = [];
    
    try {
      // If original search was for specific article, try nearby articles
      if (metadata.article_number) {
        const { data: nearbyArticles } = await this.supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', metadata.document_type || 'LUOS')
          .gte('article_number', Math.max(1, metadata.article_number - 3))
          .lte('article_number', metadata.article_number + 3)
          .order('article_number')
          .limit(5);
        
        if (nearbyArticles && nearbyArticles.length > 0) {
          results.push({
            type: 'broader_article_search',
            data: nearbyArticles,
            confidence: 0.6,
            fallback: true
          });
        }
      }
      
      // If ZOT search failed, try broader zoning search
      if (metadata.zot_number && !metadata.neighborhood) {
        const { data: zotData } = await this.supabase
          .from('regime_urbanistico_consolidado')
          .select('*')
          .ilike('zot', `%${metadata.zot_number}%`)
          .limit(10);
        
        if (zotData && zotData.length > 0) {
          results.push({
            type: 'broader_zot_search',
            data: zotData,
            confidence: 0.65,
            fallback: true
          });
        }
      }
      
      // Try document sections if nothing else worked
      if (results.length === 0) {
        const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);
        if (queryTerms.length > 0) {
          const { data: sections } = await this.supabase
            .from('document_sections')
            .select('*')
            .textSearch('content', queryTerms.join(' & '), { type: 'websearch' })
            .limit(5);
          
          if (sections && sections.length > 0) {
            results.push({
              type: 'broader_section_search',
              data: sections,
              confidence: 0.55,
              fallback: true
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Broader search error:', error);
    }
    
    return results;
  }
  
  private async executeDecomposedSearch(query: string, metadata: any): Promise<any[]> {
    console.log('🧩 Fallback: Query decomposition...');
    
    const results: any[] = [];
    const decomposedQueries = this.decomposeQuery(query, metadata);
    
    for (const subQuery of decomposedQueries) {
      try {
        // Simple text search on document sections
        const { data: sections } = await this.supabase
          .from('document_sections')
          .select('*')
          .ilike('content', `%${subQuery.term}%`)
          .limit(3);
        
        if (sections && sections.length > 0) {
          results.push({
            type: 'decomposed_search',
            subquery: subQuery.term,
            data: sections,
            confidence: 0.5,
            fallback: true
          });
        }
      } catch (error) {
        console.error(`Decomposed search error for "${subQuery.term}":`, error);
      }
    }
    
    return results;
  }
  
  private async executeSemanticSearch(query: string): Promise<any[]> {
    console.log('🎯 Fallback: Semantic similarity search...');
    
    try {
      // Try to get embedding and search
      const embedding = await this.generateEmbedding(query);
      if (embedding) {
        const { data: results } = await this.supabase.rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.5, // Lower threshold for fallback
          match_count: 8
        });
        
        if (results && results.length > 0) {
          return [{
            type: 'semantic_fallback',
            data: results,
            confidence: 0.6,
            fallback: true
          }];
        }
      }
    } catch (error) {
      console.error('Semantic search fallback error:', error);
    }
    
    return [];
  }
  
  private decomposeQuery(query: string, metadata: any): Array<{term: string, importance: number}> {
    const terms: Array<{term: string, importance: number}> = [];
    const lowerQuery = query.toLowerCase();
    
    // Extract important terms based on metadata
    if (metadata.article_number) {
      terms.push({term: `artigo ${metadata.article_number}`, importance: 0.9});
    }
    
    if (metadata.zot_number) {
      terms.push({term: `zot ${metadata.zot_number}`, importance: 0.9});
    }
    
    if (metadata.neighborhood) {
      terms.push({term: metadata.neighborhood, importance: 0.8});
    }
    
    // Extract key concepts
    const concepts = [
      'altura', 'gabarito', 'coeficiente', 'aproveitamento', 'taxa', 'ocupação',
      'zoneamento', 'uso', 'solo', 'construção', 'edificação', 'parâmetros',
      'disposições', 'transitórias', 'plano', 'diretor'
    ];
    
    for (const concept of concepts) {
      if (lowerQuery.includes(concept)) {
        terms.push({term: concept, importance: 0.6});
      }
    }
    
    // Sort by importance and return top 3
    return terms
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3);
  }
  
  generateAlternativeQueries(originalQuery: string, metadata: any): string[] {
    const alternatives: string[] = [];
    
    // Generate based on metadata
    if (metadata.article_number) {
      alternatives.push(`O que diz o artigo ${metadata.article_number}?`);
      alternatives.push(`Artigo ${metadata.article_number} ${metadata.document_type || 'LUOS'}`);
    }
    
    if (metadata.zot_number) {
      alternatives.push(`Parâmetros da ZOT ${metadata.zot_number}`);
      alternatives.push(`Zoneamento ZOT ${metadata.zot_number} características`);
    }
    
    if (metadata.neighborhood) {
      alternatives.push(`Zoneamento do bairro ${metadata.neighborhood}`);
      alternatives.push(`Parâmetros urbanísticos ${metadata.neighborhood}`);
    }
    
    // Generic alternatives
    alternatives.push(`Plano Diretor Porto Alegre`);
    alternatives.push(`Lei de Uso e Ocupação do Solo`);
    alternatives.push(`PDUS 2025 regulamentação`);
    
    return alternatives.slice(0, 5);
  }
  
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      });
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return null;
    }
  }
}

// ============================================================
// CACHE MANAGER - FASE 2 OPTIMIZATION
// ============================================================

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(query: string, metadata: any): string {
    return `${query}_${JSON.stringify(metadata)}`.toLowerCase().replace(/\s+/g, '_');
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================
// TOOLS - Specialized Search Functions
// ============================================================

class ArticleSearchTool {
  constructor(private supabase: any, private cache: CacheManager) {}
  
  async execute(query: string, metadata: any) {
    console.log('🔍 ArticleSearchTool: Searching for articles...');
    
    // Check cache first
    const cacheKey = this.cache.generateKey(`article_${query}`, metadata);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('📦 Cache hit for article search');
      return cached;
    }
    
    let result = null;
    
    // Handle multiple articles or ranges (FASE 2 enhancement)
    if (metadata.article_numbers && metadata.article_numbers.length > 1) {
      result = await this.searchMultipleArticles(metadata);
    }
    // Single article search
    else if (metadata.article_number) {
      result = await this.searchSingleArticle(metadata);
    }
    // Transitional provisions special case
    else if (metadata.transitional_provisions) {
      result = await this.searchTransitionalProvisions(metadata);
    }
    
    // Fallback to embedding search
    if (!result) {
      result = await this.performEmbeddingSearch(query);
    }
    
    // Cache the result
    if (result) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  private async searchSingleArticle(metadata: any) {
    const { data: article } = await this.supabase
      .from('legal_articles')
      .select('*')
      .eq('document_type', metadata.document_type || 'LUOS')
      .eq('article_number', metadata.article_number)
      .single();
    
    if (article) {
      // Get hierarchy context if needed
      let hierarchy = null;
      if (metadata.needs_context) {
        const { data: hierarchyData } = await this.supabase
          .rpc('get_complete_hierarchy', {
            doc_type: metadata.document_type || 'LUOS',
            art_num: metadata.article_number
          });
        hierarchy = hierarchyData;
      }
      
      return {
        type: 'article',
        data: article,
        hierarchy: hierarchy,
        confidence: 0.95
      };
    }
    return null;
  }
  
  private async searchMultipleArticles(metadata: any) {
    const { data: articles } = await this.supabase
      .from('legal_articles')
      .select('*')
      .eq('document_type', metadata.document_type || 'LUOS')
      .in('article_number', metadata.article_numbers)
      .order('article_number');
    
    if (articles && articles.length > 0) {
      return {
        type: 'multiple_articles',
        data: articles,
        article_count: articles.length,
        confidence: 0.9
      };
    }
    return null;
  }
  
  private async searchTransitionalProvisions(metadata: any) {
    // Special handling for Art. 119 LUOS (disposições transitórias)
    const { data: articles } = await this.supabase
      .from('legal_articles')
      .select('*')
      .eq('document_type', 'LUOS')
      .or('article_number.eq.119,full_content.ilike.%transitória%,full_content.ilike.%disposições%')
      .limit(5);
    
    if (articles && articles.length > 0) {
      return {
        type: 'transitional_provisions',
        data: articles,
        confidence: 0.9
      };
    }
    return null;
  }
  
  private async performEmbeddingSearch(query: string) {
    const embedding = await this.generateEmbedding(query);
    const { data: results } = await this.supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });
    
    return {
      type: 'embedding_search',
      data: results,
      confidence: 0.8
    };
  }
  
  private async generateEmbedding(text: string) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
}

class HierarchyNavigatorTool {
  constructor(private supabase: any, private cache: CacheManager) {}
  
  async execute(query: string, metadata: any) {
    console.log('📚 HierarchyNavigatorTool: Navigating hierarchy...');
    
    // Check cache first
    const cacheKey = this.cache.generateKey(`hierarchy_${query}`, metadata);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('📦 Cache hit for hierarchy search');
      return cached;
    }
    
    let result = null;
    
    if (metadata.hierarchy_type && metadata.hierarchy_number) {
      const { data: hierarchyElement } = await this.supabase
        .from('legal_hierarchy')
        .select('*')
        .eq('document_type', metadata.document_type || 'LUOS')
        .eq('hierarchy_type', metadata.hierarchy_type)
        .eq('hierarchy_number', metadata.hierarchy_number)
        .single();
      
      if (hierarchyElement) {
        // Get all articles in this hierarchy element
        const { data: articles } = await this.supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', metadata.document_type || 'LUOS')
          .gte('article_number', hierarchyElement.article_start)
          .lte('article_number', hierarchyElement.article_end)
          .order('article_number')
          .limit(15);
        
        result = {
          type: 'hierarchy',
          element: hierarchyElement,
          articles: articles,
          confidence: 0.9
        };
      }
    }
    
    // Cache result if found
    if (result) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
}

class ZOTSearchTool {
  constructor(private supabase: any, private cache: CacheManager) {}
  
  async execute(query: string, metadata: any) {
    console.log('🏙️ ZOTSearchTool: Searching ZOT data...');
    
    // Check cache first
    const cacheKey = this.cache.generateKey(`zot_${query}`, metadata);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('📦 Cache hit for ZOT search');
      return cached;
    }
    
    let queryBuilder = this.supabase
      .from('regime_urbanistico_consolidado')
      .select('*');
    
    let hasFilters = false;
    
    // Apply filters based on metadata
    if (metadata.zot_number) {
      queryBuilder = queryBuilder.eq('zot', `ZOT ${metadata.zot_number}`);
      hasFilters = true;
    }
    
    if (metadata.neighborhood) {
      queryBuilder = queryBuilder.ilike('bairro', `%${metadata.neighborhood}%`);
      hasFilters = true;
    }
    
    // Enhanced filtering for construction parameters
    if (metadata.construction_params) {
      if (metadata.construction_params.includes('altura')) {
        queryBuilder = queryBuilder.not('altura_max', 'is', null);
      }
      if (metadata.construction_params.includes('ca')) {
        queryBuilder = queryBuilder.not('ca_max', 'is', null);
      }
      if (metadata.construction_params.includes('to')) {
        queryBuilder = queryBuilder.not('to_max', 'is', null);
      }
    }
    
    // Order by relevance and limit results
    const { data: results } = await queryBuilder
      .order('zot')
      .limit(hasFilters ? 15 : 10);
    
    const result = {
      type: 'zot',
      data: results || [],
      confidence: hasFilters ? 0.9 : 0.75,
      total_found: results?.length || 0
    };
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }
}

class SQLGeneratorTool {
  constructor(private supabase: any, private cache: CacheManager) {}
  
  async execute(query: string, metadata: any) {
    console.log('🔧 SQLGeneratorTool: Generating SQL query...');
    
    // Use LLM to generate SQL
    const systemPrompt = `You are a SQL expert. Generate a PostgreSQL query for the following tables:
    - legal_articles (document_type, article_number, title, full_content)
    - legal_hierarchy (document_type, hierarchy_type, hierarchy_number, hierarchy_name, article_start, article_end)
    - regime_urbanistico_consolidado (zot, bairro, altura_max, ca_max, to_max)
    
    User query: ${query}
    
    Return ONLY the SQL query, no explanations.`;
    
    const sqlQuery = await this.generateSQL(systemPrompt, query);
    
    if (sqlQuery) {
      try {
        const { data: results } = await this.supabase.rpc('execute_dynamic_sql', {
          sql_query: sqlQuery
        });
        
        return {
          type: 'sql',
          query: sqlQuery,
          data: results,
          confidence: 0.75
        };
      } catch (error) {
        console.error('SQL execution error:', error);
      }
    }
    
    return null;
  }
  
  private async generateSQL(systemPrompt: string, userQuery: string) {
    // Simplified - would use actual LLM call
    // For now, return null to skip SQL generation
    return null;
  }
}

// ============================================================
// METADATA EXTRACTOR - FASE 2 OPTIMIZATION
// ============================================================

class MetadataExtractor {
  private readonly NEIGHBORHOODS = [
    'centro', 'cidade baixa', 'moinhos de vento', 'bela vista', 'petrópolis',
    'higienópolis', 'mont serrat', 'santana', 'floresta', 'navegantes',
    'farroupilha', 'azenha', 'menino deus', 'praia de belas', 'cristal',
    'ipanema', 'cavalhada', 'tristeza', 'campo novo', 'sarandi'
  ];

  async extract(query: string) {
    const metadata: any = {
      original_query: query,
      intent: 'general',
      confidence_factors: []
    };
    
    // FASE 2: Extract multiple articles and ranges
    await this.extractArticles(query, metadata);
    await this.extractDocumentType(query, metadata);
    await this.extractHierarchy(query, metadata);
    await this.extractZOTInfo(query, metadata);
    await this.extractNeighborhoods(query, metadata);
    await this.extractSpecialCases(query, metadata);
    await this.determineIntent(metadata);
    
    return metadata;
  }

  private async extractArticles(query: string, metadata: any) {
    // Single article
    const singleArticle = query.match(/art(?:igo)?\.?\s*(\d+)/i);
    if (singleArticle) {
      metadata.article_number = parseInt(singleArticle[1]);
      metadata.confidence_factors.push('exact_article_match');
    }

    // Multiple articles (e.g., "artigos 75, 76 e 77")
    const multipleArticles = query.match(/art(?:igos)?\.?\s*((?:\d+(?:\s*[,e]\s*)*)+)/i);
    if (multipleArticles) {
      const numbers = multipleArticles[1].match(/\d+/g);
      if (numbers && numbers.length > 1) {
        metadata.article_numbers = numbers.map(n => parseInt(n));
        metadata.is_multiple_articles = true;
        metadata.confidence_factors.push('multiple_articles_match');
      }
    }

    // Range of articles (e.g., "artigos 75 a 79" or "art. 75 ao 79")
    const rangeMatch = query.match(/art(?:igos)?\.?\s*(\d+)\s*(?:a|ao|até)\s*(\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      metadata.article_range = { start, end };
      metadata.article_numbers = [];
      for (let i = start; i <= end; i++) {
        metadata.article_numbers.push(i);
      }
      metadata.is_article_range = true;
      metadata.confidence_factors.push('article_range_match');
    }

    // Disposições transitórias - SPECIAL CASE for Art. 119 LUOS
    if (query.toLowerCase().includes('disposições transitórias') || 
        query.toLowerCase().includes('disposicoes transitorias')) {
      metadata.transitional_provisions = true;
      metadata.confidence_factors.push('transitional_provisions');
    }
  }

  private async extractDocumentType(query: string, metadata: any) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('pdus') || lowerQuery.includes('plano diretor')) {
      metadata.document_type = 'PDUS';
      metadata.confidence_factors.push('pdus_mention');
    } else if (lowerQuery.includes('luos') || lowerQuery.includes('lei de uso')) {
      metadata.document_type = 'LUOS';
      metadata.confidence_factors.push('luos_mention');
    } else {
      metadata.document_type = 'LUOS'; // Default
    }
  }

  private async extractHierarchy(query: string, metadata: any) {
    // Enhanced hierarchy detection
    const hierarchies = [
      { pattern: /título\s+([IVX]+|\d+)/i, type: 'titulo' },
      { pattern: /capítulo\s+([IVX]+|\d+)/i, type: 'capitulo' },
      { pattern: /seção\s+([IVX]+|\d+)/i, type: 'secao' },
      { pattern: /subseção\s+([IVX]+|\d+)/i, type: 'subsecao' },
      { pattern: /parte\s+([IVX]+|\d+)/i, type: 'parte' },
      { pattern: /livro\s+([IVX]+|\d+)/i, type: 'livro' }
    ];

    for (const hier of hierarchies) {
      const match = query.match(hier.pattern);
      if (match) {
        metadata.hierarchy_type = hier.type;
        metadata.hierarchy_number = match[1];
        metadata.confidence_factors.push(`${hier.type}_hierarchy`);
        break;
      }
    }
  }

  private async extractZOTInfo(query: string, metadata: any) {
    // Enhanced ZOT detection
    const zotPatterns = [
      /zot[\s-]*(\d+)/i,
      /zona[\s-]*(\d+)/i,
      /zoneamento[\s-]*(\d+)/i
    ];

    for (const pattern of zotPatterns) {
      const match = query.match(pattern);
      if (match) {
        metadata.zot_number = match[1];
        metadata.confidence_factors.push('zot_match');
        break;
      }
    }

    // Construction parameters
    if (query.toLowerCase().includes('altura') || query.toLowerCase().includes('gabarito')) {
      metadata.construction_params = metadata.construction_params || [];
      metadata.construction_params.push('altura');
    }
    if (query.toLowerCase().includes('coeficiente') || query.toLowerCase().includes('aproveitamento')) {
      metadata.construction_params = metadata.construction_params || [];
      metadata.construction_params.push('ca');
    }
    if (query.toLowerCase().includes('taxa') || query.toLowerCase().includes('ocupação')) {
      metadata.construction_params = metadata.construction_params || [];
      metadata.construction_params.push('to');
    }
  }

  private async extractNeighborhoods(query: string, metadata: any) {
    const lowerQuery = query.toLowerCase();
    
    for (const bairro of this.NEIGHBORHOODS) {
      if (lowerQuery.includes(bairro)) {
        metadata.neighborhood = bairro;
        metadata.confidence_factors.push('neighborhood_match');
        break;
      }
    }
  }

  private async extractSpecialCases(query: string, metadata: any) {
    const lowerQuery = query.toLowerCase();
    
    // Risk areas
    if (lowerQuery.includes('risco') || lowerQuery.includes('inundação') || lowerQuery.includes('deslizamento')) {
      metadata.risk_related = true;
      metadata.confidence_factors.push('risk_query');
    }

    // Environmental
    if (lowerQuery.includes('ambiental') || lowerQuery.includes('preservação') || lowerQuery.includes('verde')) {
      metadata.environmental = true;
      metadata.confidence_factors.push('environmental_query');
    }

    // Transportation
    if (lowerQuery.includes('transporte') || lowerQuery.includes('trânsito') || lowerQuery.includes('mobilidade')) {
      metadata.transportation = true;
      metadata.confidence_factors.push('transportation_query');
    }

    // Context queries (e.g., "Art. 77 contexto")
    if (lowerQuery.includes('contexto') || lowerQuery.includes('relacionado') || lowerQuery.includes('junto')) {
      metadata.needs_context = true;
      metadata.confidence_factors.push('context_request');
    }
  }

  private async determineIntent(metadata: any) {
    // Priority-based intent determination
    if (metadata.article_numbers || metadata.article_number) {
      if (metadata.is_multiple_articles || metadata.is_article_range) {
        metadata.intent = 'search_multiple_articles';
      } else {
        metadata.intent = 'search_article';
      }
    } else if (metadata.hierarchy_type) {
      metadata.intent = 'navigate_hierarchy';
    } else if (metadata.zot_number) {
      metadata.intent = 'search_zot';
    } else if (metadata.neighborhood && metadata.construction_params) {
      metadata.intent = 'search_zot_neighborhood';
    } else if (metadata.neighborhood) {
      metadata.intent = 'search_neighborhood';
    } else if (metadata.risk_related) {
      metadata.intent = 'search_risk';
    } else if (metadata.environmental) {
      metadata.intent = 'search_environmental';
    } else if (metadata.transportation) {
      metadata.intent = 'search_transportation';
    } else if (metadata.transitional_provisions) {
      metadata.intent = 'search_transitional';
    } else {
      metadata.intent = 'general_search';
    }

    // Calculate confidence score
    metadata.extraction_confidence = Math.min(0.95, 0.5 + (metadata.confidence_factors.length * 0.1));
  }
}

// ============================================================
// RERANKER - FASE 2 OPTIMIZATION
// ============================================================

class ResultReranker {
  rerank(results: any[], query: string, metadata: any): any[] {
    if (!results || results.length === 0) return results;
    
    // Calculate comprehensive scores for each result
    const scoredResults = results.map(result => ({
      ...result,
      final_score: this.calculateScore(result, query, metadata)
    }));
    
    // Sort by final score (descending)
    return scoredResults.sort((a, b) => b.final_score - a.final_score);
  }
  
  private calculateScore(result: any, query: string, metadata: any): number {
    let score = 0;
    const baseConfidence = result.confidence || 0.5;
    
    // Base confidence score (0-100)
    score += baseConfidence * 100;
    
    // Exact article match boost
    score += this.getArticleMatchBoost(result, metadata);
    
    // Document type boost
    score += this.getDocumentTypeBoost(result, metadata);
    
    // Hierarchy relevance boost
    score += this.getHierarchyBoost(result, metadata);
    
    // Content relevance boost
    score += this.getContentRelevanceBoost(result, query, metadata);
    
    // Freshness and completeness boost
    score += this.getQualityBoost(result, metadata);
    
    // Transitional provisions special handling
    score += this.getTransitionalBoost(result, metadata);
    
    // Context-aware boost
    score += this.getContextBoost(result, metadata);
    
    // Apply penalties
    score -= this.getRelevancePenalty(result, metadata);
    
    return Math.max(0, score);
  }
  
  private getArticleMatchBoost(result: any, metadata: any): number {
    let boost = 0;
    
    // Exact single article match
    if (metadata.article_number && result.data?.article_number === metadata.article_number) {
      boost += 50; // Strong boost for exact match
    }
    
    // Multiple articles match
    if (metadata.article_numbers && result.data?.article_number) {
      if (metadata.article_numbers.includes(result.data.article_number)) {
        boost += 40; // Good boost for range/multiple match
      }
    }
    
    // Partial match for similar article numbers
    if (metadata.article_number && result.data?.article_number) {
      const diff = Math.abs(metadata.article_number - result.data.article_number);
      if (diff <= 5) {
        boost += Math.max(0, 20 - (diff * 3)); // Nearby articles get smaller boost
      }
    }
    
    return boost;
  }
  
  private getDocumentTypeBoost(result: any, metadata: any): number {
    if (metadata.document_type && result.data?.document_type === metadata.document_type) {
      return 15; // Document type match
    }
    return 0;
  }
  
  private getHierarchyBoost(result: any, metadata: any): number {
    let boost = 0;
    
    if (metadata.hierarchy_type && result.element?.hierarchy_type === metadata.hierarchy_type) {
      boost += 25; // Hierarchy type match
      
      if (metadata.hierarchy_number && result.element?.hierarchy_number === metadata.hierarchy_number) {
        boost += 25; // Exact hierarchy match
      }
    }
    
    return boost;
  }
  
  private getContentRelevanceBoost(result: any, query: string, metadata: any): number {
    let boost = 0;
    const lowerQuery = query.toLowerCase();
    
    // Check content for query terms
    const content = (result.data?.full_content || result.data?.article_text || '').toLowerCase();
    
    if (content) {
      // Keyword density bonus
      const keywords = lowerQuery.split(/\s+/).filter(word => word.length > 3);
      const matches = keywords.filter(keyword => content.includes(keyword));
      boost += matches.length * 5;
      
      // Special terms boost
      if (metadata.construction_params) {
        metadata.construction_params.forEach((param: string) => {
          if (content.includes(param)) boost += 10;
        });
      }
      
      if (metadata.risk_related && (content.includes('risco') || content.includes('inundação'))) {
        boost += 15;
      }
      
      if (metadata.environmental && (content.includes('ambiental') || content.includes('preservação'))) {
        boost += 15;
      }
    }
    
    return boost;
  }
  
  private getQualityBoost(result: any, metadata: any): number {
    let boost = 0;
    
    // Completeness boost
    if (result.data?.full_content && result.data.full_content.length > 100) {
      boost += 10; // Has substantial content
    }
    
    // Hierarchy context boost
    if (result.hierarchy) {
      boost += 15; // Has hierarchical context
    }
    
    // Multiple sources boost
    if (result.articles && result.articles.length > 1) {
      boost += 10; // Multiple related articles
    }
    
    return boost;
  }
  
  private getTransitionalBoost(result: any, metadata: any): number {
    if (metadata.transitional_provisions) {
      const content = (result.data?.full_content || result.data?.article_text || '').toLowerCase();
      if (content.includes('transitória') || content.includes('disposições')) {
        return 30; // Strong boost for transitional provisions
      }
    }
    return 0;
  }
  
  private getContextBoost(result: any, metadata: any): number {
    if (metadata.needs_context) {
      // Boost results that provide hierarchical context
      if (result.hierarchy || result.articles) {
        return 20;
      }
    }
    return 0;
  }
  
  private getRelevancePenalty(result: any, metadata: any): number {
    let penalty = 0;
    
    // Penalize results from wrong document type
    if (metadata.document_type && result.data?.document_type && 
        result.data.document_type !== metadata.document_type) {
      penalty += 20;
    }
    
    // Penalize very short content
    const content = result.data?.full_content || result.data?.article_text || '';
    if (content.length < 50) {
      penalty += 15;
    }
    
    // Penalize if no exact matches found for specific queries
    if ((metadata.article_number || metadata.zot_number) && !result.data) {
      penalty += 25;
    }
    
    return penalty;
  }
  
  // Get top N results with minimum score threshold
  getTopResults(results: any[], maxResults: number = 5, minScore: number = 50): any[] {
    return results
      .filter(result => (result.final_score || 0) >= minScore)
      .slice(0, maxResults);
  }
}

// ============================================================
// MEMORY MANAGER
// ============================================================

class MemoryManager {
  constructor(private supabase: any) {}
  
  async saveInteraction(sessionId: string, query: string, response: string, metadata: any) {
    await this.supabase.from('chat_memory').insert({
      session_id: sessionId,
      user_message: query,
      assistant_response: response,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
  }
  
  async getContext(sessionId: string, limit = 5) {
    const { data } = await this.supabase
      .from('chat_memory')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
}

// ============================================================
// ORCHESTRATOR - FASE 2 OPTIMIZATION
// ============================================================

class AgenticRAGOrchestrator {
  private tools: any[];
  private metadataExtractor: MetadataExtractor;
  private reranker: ResultReranker;
  private memoryManager: MemoryManager;
  private cache: CacheManager;
  private fallbackManager: FallbackManager; // FASE 3
  private readonly MAX_CONTEXT_TOKENS = 3000; // FASE 3 - Context window limit
  
  constructor(private supabase: any) {
    this.cache = new CacheManager();
    this.fallbackManager = new FallbackManager(supabase); // FASE 3
    this.tools = [
      new ArticleSearchTool(supabase, this.cache),
      new HierarchyNavigatorTool(supabase, this.cache),
      new ZOTSearchTool(supabase, this.cache),
      new SQLGeneratorTool(supabase, this.cache)
    ];
    this.metadataExtractor = new MetadataExtractor();
    this.reranker = new ResultReranker();
    this.memoryManager = new MemoryManager(supabase);
    
    // Cleanup cache periodically
    setInterval(() => this.cache.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }
  
  async process(query: string, sessionId: string) {
    console.log('🤖 AgenticRAG v3.0 - Processing query:', query);
    
    const startTime = Date.now();
    
    try {
      // 1. Extract metadata
      const metadata = await this.metadataExtractor.extract(query);
      console.log('📋 Extracted metadata:', metadata);
      console.log(`🎯 Intent: ${metadata.intent} (confidence: ${metadata.extraction_confidence})`);
      
      // 2. Get conversation context
      const context = await this.memoryManager.getContext(sessionId);
      
      // 3. FASE 2: Execute tools in parallel based on intent
      const toolResults = await this.executeToolsParallel(query, metadata);
      
      // 4. Filter and rerank results
      let validResults = toolResults.filter(r => r !== null && r !== undefined);
      console.log(`📊 Found ${validResults.length} results from ${toolResults.length} tool executions`);
      
      // FASE 3: Apply fallback strategies if results are poor or empty
      if (validResults.length === 0 || this.shouldApplyFallbacks(validResults, metadata)) {
        console.log('🔄 Applying fallback strategies...');
        const fallbackResults = await this.fallbackManager.executeFallbackStrategies(query, metadata, validResults);
        validResults = [...validResults, ...fallbackResults];
        console.log(`📈 After fallbacks: ${validResults.length} total results`);
      }
      
      const rerankedResults = this.reranker.rerank(validResults, query, metadata);
      const topResults = this.reranker.getTopResults(rerankedResults, 5, 30);
      
      // 5. Generate response with context window management (FASE 3)
      const response = await this.generateResponse(topResults, query, metadata, context);
      
      // 6. FASE 3: Calculate quality score
      const qualityScore = QualityScorer.calculateQualityScore(response, query, topResults, metadata);
      
      // 7. Save to memory
      await this.memoryManager.saveInteraction(sessionId, query, response, {
        ...metadata,
        quality_score: qualityScore,
        sources_count: topResults.length
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Processing completed in ${processingTime}ms`);
      
      return {
        response,
        metadata,
        sources: topResults.length,
        confidence: topResults[0]?.final_score || metadata.extraction_confidence || 0.5,
        quality_score: qualityScore, // FASE 3
        processing_time: processingTime,
        cache_hits: this.getCacheStats(),
        performance_target: processingTime < 3000 ? '✅ <3s' : '⚠️ >3s' // FASE 3
      };
      
    } catch (error) {
      console.error('❌ Error in orchestrator:', error);
      throw error;
    }
  }
  
  // FASE 2: Parallel Tool Execution with Promise.allSettled
  private async executeToolsParallel(query: string, metadata: any): Promise<any[]> {
    const toolPromises: Promise<any>[] = [];
    const toolNames: string[] = [];
    
    // Determine which tools to execute based on intent and metadata
    const toolSelections = this.selectTools(metadata);
    
    console.log(`🔧 Executing ${toolSelections.length} tools in parallel:`, toolSelections.map(t => t.name));
    
    // Create promises for selected tools
    for (const selection of toolSelections) {
      toolPromises.push(
        this.tools[selection.index].execute(query, metadata)
          .catch((error: any) => {
            console.error(`❌ Tool ${selection.name} failed:`, error);
            return null; // Return null on error to continue with other tools
          })
      );
      toolNames.push(selection.name);
    }
    
    // Execute all tools in parallel using Promise.allSettled for robustness
    const results = await Promise.allSettled(toolPromises);
    
    // Process results and log performance
    const toolResults: any[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        toolResults.push(result.value);
        console.log(`✅ ${toolNames[index]}: Success`);
      } else {
        console.log(`❌ ${toolNames[index]}: ${result.status === 'fulfilled' ? 'No results' : 'Failed'}`);
      }
    });
    
    return toolResults;
  }
  
  // Enhanced tool selection logic
  private selectTools(metadata: any): Array<{name: string, index: number}> {
    const selections: Array<{name: string, index: number}> = [];
    
    // Always try ArticleSearchTool for article-related queries
    if (metadata.intent.includes('article') || metadata.article_number || metadata.article_numbers) {
      selections.push({name: 'ArticleSearchTool', index: 0});
    }
    
    // HierarchyNavigatorTool for hierarchy navigation
    if (metadata.intent === 'navigate_hierarchy' || metadata.hierarchy_type) {
      selections.push({name: 'HierarchyNavigatorTool', index: 1});
    }
    
    // ZOTSearchTool for zoning queries
    if (metadata.intent.includes('zot') || metadata.zot_number || 
        metadata.neighborhood || metadata.construction_params) {
      selections.push({name: 'ZOTSearchTool', index: 2});
    }
    
    // For complex or general queries, try multiple tools
    if (metadata.intent === 'general_search' || metadata.needs_context) {
      selections.push({name: 'ArticleSearchTool', index: 0});
      if (metadata.neighborhood || metadata.zot_number) {
        selections.push({name: 'ZOTSearchTool', index: 2});
      }
    }
    
    // Special cases
    if (metadata.transitional_provisions) {
      selections.push({name: 'ArticleSearchTool', index: 0});
    }
    
    // Ensure at least one tool is selected
    if (selections.length === 0) {
      selections.push({name: 'ArticleSearchTool', index: 0});
    }
    
    // Remove duplicates
    const uniqueSelections = selections.filter((item, index, self) => 
      index === self.findIndex(t => t.index === item.index)
    );
    
    return uniqueSelections;
  }
  
  // FASE 3: Determine if fallback strategies should be applied
  private shouldApplyFallbacks(results: any[], metadata: any): boolean {
    // Apply fallbacks if no results
    if (results.length === 0) return true;
    
    // Apply fallbacks if all results have low confidence
    const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
    if (avgConfidence < 0.6) return true;
    
    // Apply fallbacks for specific high-precision queries that returned generic results
    if (metadata.article_number || metadata.zot_number) {
      const hasSpecificMatch = results.some(r => 
        r.type === 'article' || 
        r.type === 'zot' ||
        (r.data && (r.data.article_number || r.data.zot))
      );
      if (!hasSpecificMatch) return true;
    }
    
    return false;
  }
  
  private getCacheStats(): any {
    // Simple cache stats - in production you'd track hits/misses
    return {
      enabled: true,
      ttl: '1 hour'
    };
  }
  
  private async generateResponse(results: any[], query: string, metadata: any, context: any[]) {
    if (results.length === 0) {
      return `Desculpe, não encontrei informações específicas sobre "${query}" na base de conhecimento. Você poderia reformular sua pergunta ou ser mais específico sobre o artigo ou tema de interesse?`;
    }
    
    // Build enhanced context from results with FASE 3 context window management
    const contextParts = [];
    const sourcesList = [];
    
    // FASE 3: Prioritize results based on relevance for context window
    const prioritizedResults = this.prioritizeResultsForContext(results, metadata);
    
    for (const result of prioritizedResults) {
      // Handle single articles
      if (result.type === 'article' && result.data) {
        if (result.hierarchy) {
          contextParts.push(`[CONTEXTO HIERÁRQUICO] ${result.hierarchy}`);
        }
        const content = result.data.full_content || result.data.article_text || result.data.title;
        contextParts.push(`[${result.data.document_type} Art. ${result.data.article_number}] ${content}`);
        sourcesList.push(`Art. ${result.data.article_number} ${result.data.document_type}`);
      }
      
      // Handle multiple articles (FASE 2 enhancement)
      else if (result.type === 'multiple_articles' && result.data) {
        contextParts.push(`[MÚLTIPLOS ARTIGOS ${result.data[0]?.document_type || 'LUOS'}]`);
        result.data.forEach((article: any) => {
          const content = article.full_content || article.article_text || article.title;
          contextParts.push(`Art. ${article.article_number}: ${content}`);
          sourcesList.push(`Art. ${article.article_number}`);
        });
      }
      
      // Handle transitional provisions (FASE 2 enhancement)
      else if (result.type === 'transitional_provisions' && result.data) {
        contextParts.push(`[DISPOSIÇÕES TRANSITÓRIAS]`);
        result.data.forEach((article: any) => {
          const content = article.full_content || article.article_text || article.title;
          contextParts.push(`Art. ${article.article_number}: ${content}`);
          sourcesList.push(`Art. ${article.article_number} (Disposições Transitórias)`);
        });
      }
      
      // Handle hierarchy navigation
      else if (result.type === 'hierarchy' && result.element) {
        contextParts.push(`[${result.element.hierarchy_type.toUpperCase()} ${result.element.hierarchy_number}] ${result.element.hierarchy_name}`);
        if (result.articles) {
          contextParts.push(`Artigos incluídos:`);
          result.articles.forEach((art: any) => {
            contextParts.push(`- Art. ${art.article_number}: ${art.title}`);
            sourcesList.push(`Art. ${art.article_number}`);
          });
        }
      }
      
      // Handle ZOT data
      else if (result.type === 'zot' && result.data && result.data.length > 0) {
        contextParts.push(`[INFORMAÇÕES DE ZONEAMENTO]`);
        result.data.forEach((zot: any) => {
          const params = [];
          if (zot.altura_max) params.push(`Altura máx: ${zot.altura_max}m`);
          if (zot.ca_max) params.push(`CA: ${zot.ca_max}`);
          if (zot.to_max) params.push(`TO: ${zot.to_max}%`);
          
          contextParts.push(`${zot.zot} - ${zot.bairro}: ${params.join(', ')}`);
          sourcesList.push(`${zot.zot} (${zot.bairro})`);
        });
      }
      
      // Handle embedding search results
      else if (result.type === 'embedding_search' && result.data) {
        contextParts.push(`[BUSCA SEMÂNTICA]`);
        result.data.slice(0, 3).forEach((doc: any) => {
          contextParts.push(`${doc.content || doc.text}`);
          if (doc.source) sourcesList.push(doc.source);
        });
      }
    }
    
    // FASE 3: Apply context window management
    const limitedContextParts = TokenCounter.limitContext(contextParts, this.MAX_CONTEXT_TOKENS - 500); // Reserve 500 tokens for system prompt
    const contextString = limitedContextParts.join('\n\n');
    
    console.log(`📝 Context: ${contextParts.length} parts → ${limitedContextParts.length} parts (${TokenCounter.countTokens(contextString)} tokens)`);
    
    // Enhanced system prompt for better responses
    let systemPrompt = `Você é um assistente especializado no Plano Diretor de Porto Alegre (PDUS 2025) e na Lei de Uso e Ocupação do Solo (LUOS).
    
INSTRUÇÕES:
- Use APENAS as informações fornecidas no contexto abaixo
- Seja preciso e cite as fontes específicas (artigos, ZOTs, etc.)
- Se a informação não estiver completa no contexto, mencione isso
- Para múltiplos artigos, organize a resposta de forma clara
- Responda em português brasileiro de forma profissional
- Para disposições transitórias, explique claramente o caráter temporário das normas`;

    // Add special instructions based on query type
    if (metadata.transitional_provisions) {
      systemPrompt += `\n- FOCO: Esta consulta é sobre disposições transitórias - explique claramente o caráter temporário e as condições especiais`;
    }
    
    if (metadata.needs_context) {
      systemPrompt += `\n- CONTEXTO: O usuário pediu informações contextuais - forneça informações sobre artigos relacionados e hierarquia`;
    }
    
    systemPrompt += `\n\nCONTEXTO:\n${contextString}`;
    
    const response = await this.callLLM(systemPrompt, query);
    
    // Add sources information if available
    if (sourcesList.length > 0) {
      const uniqueSources = [...new Set(sourcesList)];
      return `${response}\n\n📚 Fontes consultadas: ${uniqueSources.slice(0, 5).join(', ')}${uniqueSources.length > 5 ? ' e outros.' : ''}`;
    }
    
    return response;
  }
  
  // FASE 3: Prioritize results for context window based on relevance
  private prioritizeResultsForContext(results: any[], metadata: any): any[] {
    const prioritized = [...results];
    
    // Sort by relevance score and type priority
    prioritized.sort((a, b) => {
      // Exact matches get highest priority
      const aPriority = this.getContextPriority(a, metadata);
      const bPriority = this.getContextPriority(b, metadata);
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by confidence/final score
      const aScore = a.final_score || a.confidence || 0;
      const bScore = b.final_score || b.confidence || 0;
      return bScore - aScore;
    });
    
    return prioritized;
  }
  
  private getContextPriority(result: any, metadata: any): number {
    let priority = 0;
    
    // Exact article matches get highest priority
    if (result.type === 'article' && metadata.article_number && 
        result.data?.article_number === metadata.article_number) {
      priority += 100;
    }
    
    // Multiple articles matches
    if (result.type === 'multiple_articles') {
      priority += 80;
    }
    
    // ZOT matches
    if (result.type === 'zot' && metadata.zot_number) {
      priority += 70;
    }
    
    // Hierarchy matches
    if (result.type === 'hierarchy' && metadata.hierarchy_type) {
      priority += 60;
    }
    
    // Transitional provisions
    if (result.type === 'transitional_provisions') {
      priority += 90;
    }
    
    // Penalize fallback results slightly
    if (result.fallback) {
      priority -= 10;
    }
    
    return priority;
  }
  
  private async callLLM(systemPrompt: string, userQuery: string) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
      });
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM call error:', error);
      return "Erro ao processar resposta. Por favor, tente novamente.";
    }
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, sessionId = 'default', modelPreference = 'gpt-4o-mini' } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process with orchestrator
    const orchestrator = new AgenticRAGOrchestrator(supabase);
    const result = await orchestrator.process(query, sessionId);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente."
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});