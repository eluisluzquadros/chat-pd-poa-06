/**
 * Cache Middleware for Chat PD POA Edge Functions
 * Provides seamless caching integration for all RAG functions
 */

import { getEnhancedCache, EnhancedQueryCache, CacheConfig } from './enhanced-cache.ts';

export interface CacheableRequest {
  originalQuery: string;
  analysisResult?: any;
  userRole?: string;
  context?: any;
  sessionId?: string;
}

export interface CacheableResponse {
  response: string;
  confidence: number;
  sources?: {
    tabular: number;
    conceptual: number;
  };
  analysisResult?: any;
}

export interface CacheMiddlewareConfig extends Partial<CacheConfig> {
  enableResponseCaching: boolean;
  enableQueryAnalysisCache: boolean;
  enableVectorSearchCache: boolean;
  cacheKeyPrefix: string;
  bypassCacheForRoles?: string[];
}

export class CacheMiddleware {
  private cache: EnhancedQueryCache;
  private config: CacheMiddlewareConfig;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<CacheMiddlewareConfig>
  ) {
    this.config = {
      enableResponseCaching: true,
      enableQueryAnalysisCache: true,
      enableVectorSearchCache: true,
      cacheKeyPrefix: 'pdpoa',
      defaultTTL: 20 * 60 * 1000, // 20 minutes for RAG responses
      maxMemoryEntries: 150,
      highConfidenceThreshold: 0.8,
      enableMetrics: true,
      bypassCacheForRoles: [], // No bypass by default
      ...config
    };

    this.cache = getEnhancedCache(supabaseUrl, supabaseKey, this.config);
  }

  /**
   * Cache wrapper for final RAG responses
   */
  async cacheResponse(
    request: CacheableRequest,
    handler: () => Promise<CacheableResponse>
  ): Promise<CacheableResponse & { fromCache: boolean; cacheStats?: any }> {
    if (!this.config.enableResponseCaching || this.shouldBypassCache(request.userRole)) {
      const result = await handler();
      return { ...result, fromCache: false };
    }

    const cacheKey = this.generateResponseCacheKey(request);
    const category = this.categorizeQuery(request.originalQuery, request.analysisResult);

    // Try cache first
    const cached = await this.cache.get(cacheKey, {
      userRole: request.userRole,
      sessionContext: request.context
    });

    if (cached) {
      console.log(`🎯 Cache HIT for response: ${request.originalQuery.substring(0, 50)}...`);
      
      try {
        const parsedResponse = JSON.parse(cached.response);
        return {
          ...parsedResponse,
          fromCache: true,
          cacheStats: {
            hitCount: cached.hitCount,
            lastAccessed: cached.lastAccessed,
            confidence: cached.confidence
          }
        };
      } catch (error) {
        console.error('Cache parse error:', error);
        // Fall through to handler
      }
    }

    // Execute handler and cache result
    console.log(`💾 Cache MISS for response: ${request.originalQuery.substring(0, 50)}...`);
    const result = await handler();
    
    // Cache successful responses with good confidence
    if (result.confidence >= 0.6 && !this.isErrorResponse(result.response)) {
      await this.cache.set(
        cacheKey,
        JSON.stringify(result),
        result.confidence,
        category,
        {
          userRole: request.userRole,
          sessionContext: request.context
        },
        this.calculateResponseTTL(result.confidence, category),
        {
          queryLength: request.originalQuery.length,
          hasAnalysis: !!request.analysisResult,
          sourceCount: (result.sources?.tabular || 0) + (result.sources?.conceptual || 0),
          timestamp: new Date().toISOString()
        }
      );
    }

    return { ...result, fromCache: false };
  }

  /**
   * Cache wrapper for query analysis results
   */
  async cacheQueryAnalysis(
    query: string,
    userRole: string | undefined,
    handler: () => Promise<any>
  ): Promise<any & { fromCache: boolean }> {
    if (!this.config.enableQueryAnalysisCache || this.shouldBypassCache(userRole)) {
      const result = await handler();
      return { ...result, fromCache: false };
    }

    const cacheKey = this.generateAnalysisCacheKey(query, userRole);

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🧠 Analysis cache HIT: ${query.substring(0, 50)}...`);
      try {
        const parsedAnalysis = JSON.parse(cached.response);
        return { ...parsedAnalysis, fromCache: true };
      } catch (error) {
        console.error('Analysis cache parse error:', error);
      }
    }

    // Execute handler and cache result
    console.log(`🧠 Analysis cache MISS: ${query.substring(0, 50)}...`);
    const result = await handler();
    
    // Cache analysis results (they're typically stable)
    await this.cache.set(
      cacheKey,
      JSON.stringify(result),
      0.9, // High confidence for analysis caching
      'analysis',
      { userRole },
      30 * 60 * 1000, // 30 minutes TTL for analysis
      {
        analysisType: result.intent || 'unknown',
        hasEntities: !!(result.entities?.bairros?.length || result.entities?.zots?.length),
        isConstructionQuery: result.isConstructionQuery || false
      }
    );

    return { ...result, fromCache: false };
  }

  /**
   * Cache wrapper for vector search results
   */
  async cacheVectorSearch(
    query: string,
    context: any,
    handler: () => Promise<any>
  ): Promise<any & { fromCache: boolean }> {
    if (!this.config.enableVectorSearchCache) {
      const result = await handler();
      return { ...result, fromCache: false };
    }

    const cacheKey = this.generateVectorCacheKey(query, context);

    // Try cache first
    const cached = await this.cache.get(cacheKey, context);
    if (cached) {
      console.log(`🔍 Vector cache HIT: ${query.substring(0, 50)}...`);
      try {
        const parsedResults = JSON.parse(cached.response);
        return { ...parsedResults, fromCache: true };
      } catch (error) {
        console.error('Vector cache parse error:', error);
      }
    }

    // Execute handler and cache result
    console.log(`🔍 Vector cache MISS: ${query.substring(0, 50)}...`);
    const result = await handler();
    
    // Cache vector results if we have good matches
    const hasGoodMatches = result.matches && result.matches.length > 0 && 
                          result.matches.some((m: any) => m.similarity > 0.3);
    
    if (hasGoodMatches) {
      await this.cache.set(
        cacheKey,
        JSON.stringify(result),
        0.8, // Good confidence for vector search
        'vector_search',
        context,
        15 * 60 * 1000, // 15 minutes TTL for vector search
        {
          matchCount: result.matches?.length || 0,
          topSimilarity: result.matches?.[0]?.similarity || 0,
          hasContextualBoost: result.matches?.some((m: any) => m.contextual_boost_info)
        }
      );
    }

    return { ...result, fromCache: false };
  }

  /**
   * Cache wrapper for SQL execution results
   */
  async cacheSQLResults(
    sqlQuery: string,
    context: any,
    handler: () => Promise<any>
  ): Promise<any & { fromCache: boolean }> {
    const cacheKey = this.generateSQLCacheKey(sqlQuery, context);

    // Try cache first
    const cached = await this.cache.get(cacheKey, context);
    if (cached) {
      console.log(`🗄️ SQL cache HIT: ${sqlQuery.substring(0, 50)}...`);
      try {
        const parsedResults = JSON.parse(cached.response);
        return { ...parsedResults, fromCache: true };
      } catch (error) {
        console.error('SQL cache parse error:', error);
      }
    }

    // Execute handler and cache result
    console.log(`🗄️ SQL cache MISS: ${sqlQuery.substring(0, 50)}...`);
    const result = await handler();
    
    // Cache SQL results if successful and has data
    const hasValidData = result.executionResults && 
                        result.executionResults.some((r: any) => r.data && r.data.length > 0);
    
    if (hasValidData) {
      await this.cache.set(
        cacheKey,
        JSON.stringify(result),
        0.9, // High confidence for SQL results
        'sql_data',
        context,
        60 * 60 * 1000, // 1 hour TTL for SQL data (more stable)
        {
          queryType: this.detectSQLQueryType(sqlQuery),
          resultCount: result.executionResults?.reduce((sum: number, r: any) => sum + (r.data?.length || 0), 0) || 0,
          hasErrors: result.executionResults?.some((r: any) => r.error)
        }
      );
    }

    return { ...result, fromCache: false };
  }

  /**
   * Invalidate cache entries by pattern or category
   */
  async invalidateCache(pattern: string, type: 'pattern' | 'category' = 'pattern'): Promise<void> {
    if (type === 'category') {
      await this.cache.invalidateByCategory(pattern);
    } else {
      await this.cache.invalidate(pattern, true);
    }
    
    console.log(`🗑️ Cache invalidated: ${type} = ${pattern}`);
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics() {
    return this.cache.getMetrics();
  }

  /**
   * Manual cache cleanup
   */
  async cleanupCache(): Promise<void> {
    await this.cache.cleanupExpired();
    console.log('🧹 Cache cleanup completed');
  }

  // Private helper methods

  private generateResponseCacheKey(request: CacheableRequest): string {
    const baseKey = `${this.config.cacheKeyPrefix}:response`;
    const queryHash = this.hashString(request.originalQuery);
    const contextHash = this.hashString(JSON.stringify({
      userRole: request.userRole,
      hasAnalysis: !!request.analysisResult,
      entities: request.analysisResult?.entities
    }));
    return `${baseKey}:${queryHash}:${contextHash}`;
  }

  private generateAnalysisCacheKey(query: string, userRole?: string): string {
    const baseKey = `${this.config.cacheKeyPrefix}:analysis`;
    const queryHash = this.hashString(query);
    const roleHash = this.hashString(userRole || 'anonymous');
    return `${baseKey}:${queryHash}:${roleHash}`;
  }

  private generateVectorCacheKey(query: string, context: any): string {
    const baseKey = `${this.config.cacheKeyPrefix}:vector`;
    const queryHash = this.hashString(query);
    const contextHash = this.hashString(JSON.stringify(context || {}));
    return `${baseKey}:${queryHash}:${contextHash}`;
  }

  private generateSQLCacheKey(sqlQuery: string, context: any): string {
    const baseKey = `${this.config.cacheKeyPrefix}:sql`;
    const queryHash = this.hashString(sqlQuery);
    const contextHash = this.hashString(JSON.stringify(context || {}));
    return `${baseKey}:${queryHash}:${contextHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private categorizeQuery(query: string, analysisResult?: any): string {
    if (analysisResult?.isConstructionQuery) return 'construction';
    if (analysisResult?.intent === 'data_analysis') return 'analysis';
    if (query.toLowerCase().includes('artigo') || query.toLowerCase().includes('art.')) return 'legal';
    if (query.toLowerCase().includes('zot') || query.toLowerCase().includes('zona')) return 'zoning';
    if (analysisResult?.intent === 'calculation') return 'calculation';
    return 'general';
  }

  private calculateResponseTTL(confidence: number, category: string): number {
    let baseTTL = this.config.defaultTTL || 20 * 60 * 1000;

    // Confidence-based TTL adjustment
    if (confidence >= 0.9) baseTTL *= 2;
    else if (confidence >= 0.8) baseTTL *= 1.5;
    else if (confidence < 0.7) baseTTL *= 0.5;

    // Category-based TTL adjustment
    const categoryMultipliers: Record<string, number> = {
      'legal': 3.0,        // Legal content is very stable
      'construction': 2.0,  // Construction parameters are stable
      'zoning': 2.0,       // Zoning info is stable
      'sql_data': 2.5,     // Database results are stable
      'analysis': 1.0,     // Analysis results moderate stability
      'general': 1.0,      // Default
      'calculation': 0.5   // Calculations may need updates
    };

    const multiplier = categoryMultipliers[category] || 1.0;
    return Math.floor(baseTTL * multiplier);
  }

  private shouldBypassCache(userRole?: string): boolean {
    return this.config.bypassCacheForRoles?.includes(userRole || 'anonymous') || false;
  }

  private isErrorResponse(response: string): boolean {
    const errorIndicators = [
      'versão Beta',
      'não consigo',
      'erro',
      'falha',
      'problema',
      'indisponível',
      'tente novamente'
    ];
    
    const lowerResponse = response.toLowerCase();
    return errorIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  private detectSQLQueryType(sqlQuery: string): string {
    const query = sqlQuery.toLowerCase();
    if (query.includes('bairros_risco_desastre')) return 'disaster_risk';
    if (query.includes('document_embeddings')) return 'document_search';
    if (query.includes('zot') || query.includes('zona')) return 'zoning';
    if (query.includes('altura') || query.includes('coeficiente')) return 'construction_params';
    return 'general';
  }
}

// Factory function for easy integration
export function createCacheMiddleware(
  supabaseUrl: string,
  supabaseKey: string,
  config?: Partial<CacheMiddlewareConfig>
): CacheMiddleware {
  return new CacheMiddleware(supabaseUrl, supabaseKey, config);
}

// Utility functions for direct use in Edge Functions
export const CacheUtils = {
  /**
   * Simple cache wrapper for any function
   */
  withCache: async <T>(
    cacheKey: string,
    handler: () => Promise<T>,
    cache: EnhancedQueryCache,
    ttl?: number,
    category: string = 'general'
  ): Promise<T & { fromCache?: boolean }> => {
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        const result = JSON.parse(cached.response);
        return { ...result, fromCache: true };
      } catch (error) {
        console.error('Cache parse error:', error);
      }
    }

    const result = await handler();
    await cache.set(
      cacheKey,
      JSON.stringify(result),
      0.8,
      category,
      undefined,
      ttl
    );

    return { ...result as any, fromCache: false };
  },

  /**
   * Generate consistent cache keys
   */
  generateKey: (prefix: string, ...parts: string[]): string => {
    return `${prefix}:${parts.map(p => 
      typeof p === 'string' ? p.replace(/[^a-zA-Z0-9]/g, '_') : String(p)
    ).join(':')}`;
  },

  /**
   * Cache performance monitoring
   */
  logCachePerformance: (metrics: any, functionName: string): void => {
    console.log(`📊 Cache Performance [${functionName}]:`, {
      hitRate: (metrics.hitRate * 100).toFixed(1) + '%',
      totalEntries: metrics.totalEntries,
      memoryEntries: metrics.memoryEntries,
      avgResponseTime: metrics.avgResponseTime.toFixed(2) + 'ms',
      effectiveness: (metrics.cacheEffectiveness * 100).toFixed(1) + '%'
    });
  }
};