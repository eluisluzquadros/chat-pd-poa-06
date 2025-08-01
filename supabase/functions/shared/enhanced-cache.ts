/**
 * Enhanced Query Cache System for Chat PD POA
 * Implements robust caching with TTL, invalidation, and performance metrics
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxMemoryEntries: number;
  highConfidenceThreshold: number;
  enableMetrics: boolean;
}

export interface CacheEntry {
  key: string;
  query: string;
  response: string;
  confidence: number;
  category: string;
  timestamp: Date;
  lastAccessed: Date;
  hitCount: number;
  ttl: number;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  totalEntries: number;
  memoryEntries: number;
  hitRate: number;
  missRate: number;
  avgResponseTime: number;
  totalHits: number;
  totalMisses: number;
  cacheEffectiveness: number;
}

export class EnhancedQueryCache {
  private supabase: any;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(supabaseUrl: string, supabaseKey: string, config?: Partial<CacheConfig>) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = {
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      maxMemoryEntries: 200,
      highConfidenceThreshold: 0.8,
      enableMetrics: true,
      ...config
    };
    
    this.metrics = {
      totalEntries: 0,
      memoryEntries: 0,
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheEffectiveness: 0
    };

    this.initializeCache();
  }

  /**
   * Generate optimized cache key with context awareness
   */
  private generateCacheKey(query: string, context?: any): string {
    const normalizedQuery = this.normalizeQuery(query);
    const contextHash = context ? this.hashObject(context) : '';
    return this.hashString(normalizedQuery + contextHash);
  }

  /**
   * Normalize query for better cache hit rates
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c');
  }

  /**
   * Fast hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash object for context awareness
   */
  private hashObject(obj: any): string {
    return this.hashString(JSON.stringify(obj, Object.keys(obj).sort()));
  }

  /**
   * Get cached response with metrics tracking
   */
  async get(query: string, context?: any): Promise<CacheEntry | null> {
    const startTime = Date.now();
    const key = this.generateCacheKey(query, context);

    try {
      // Check memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        memoryEntry.hitCount++;
        memoryEntry.lastAccessed = new Date();
        this.updateMetrics('hit', Date.now() - startTime);
        return memoryEntry;
      }

      // Check database cache
      const { data, error } = await this.supabase
        .from('query_cache')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) {
        this.updateMetrics('miss', Date.now() - startTime);
        return null;
      }

      const entry: CacheEntry = {
        key: data.key,
        query: data.query,
        response: data.response,
        confidence: data.confidence,
        category: data.category,
        timestamp: new Date(data.timestamp),
        lastAccessed: new Date(),
        hitCount: data.hit_count + 1,
        ttl: data.ttl || this.config.defaultTTL,
        metadata: data.metadata
      };

      if (this.isValid(entry)) {
        // Update hit count and last accessed in database
        await this.supabase
          .from('query_cache')
          .update({ 
            hit_count: entry.hitCount,
            last_accessed: entry.lastAccessed
          })
          .eq('key', key);

        // Add to memory cache
        this.addToMemoryCache(entry);
        this.updateMetrics('hit', Date.now() - startTime);
        return entry;
      } else {
        // Remove expired entry
        await this.invalidate(key);
        this.updateMetrics('miss', Date.now() - startTime);
        return null;
      }
    } catch (error) {
      console.error('Enhanced cache get error:', error);
      this.updateMetrics('miss', Date.now() - startTime);
      return null;
    }
  }

  /**
   * Set cache entry with enhanced TTL and categorization
   */
  async set(
    query: string,
    response: string,
    confidence: number,
    category: string = 'general',
    context?: any,
    customTTL?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Enhanced caching strategy
    if (confidence < 0.6) return; // Minimum threshold
    if (response.includes('versão Beta') || response.includes('não consigo')) return;
    if (response.length < 50) return; // Avoid caching very short responses

    const key = this.generateCacheKey(query, context);
    const ttl = customTTL || this.calculateDynamicTTL(confidence, category);
    
    const entry: CacheEntry = {
      key,
      query,
      response,
      confidence,
      category,
      timestamp: new Date(),
      lastAccessed: new Date(),
      hitCount: 0,
      ttl,
      metadata
    };

    try {
      // Store in database with enhanced metadata
      await this.supabase
        .from('query_cache')
        .upsert({
          key: entry.key,
          query: entry.query,
          response: entry.response,
          confidence: entry.confidence,
          category: entry.category,
          timestamp: entry.timestamp,
          last_accessed: entry.lastAccessed,
          hit_count: entry.hitCount,
          ttl: entry.ttl,
          metadata: entry.metadata
        });

      // Add to memory cache if high confidence
      if (confidence >= this.config.highConfidenceThreshold) {
        this.addToMemoryCache(entry);
      }

      this.metrics.totalEntries++;
    } catch (error) {
      console.error('Enhanced cache set error:', error);
    }
  }

  /**
   * Calculate dynamic TTL based on confidence and category
   */
  private calculateDynamicTTL(confidence: number, category: string): number {
    let baseTTL = this.config.defaultTTL;

    // High confidence responses live longer
    if (confidence >= 0.9) baseTTL *= 2;
    else if (confidence >= 0.8) baseTTL *= 1.5;

    // Category-specific TTL adjustments
    const categoryMultipliers: Record<string, number> = {
      'construction': 1.5, // Construction queries are stable
      'legal': 2.0,        // Legal content changes less frequently
      'zoning': 1.5,       // Zoning info is relatively stable
      'general': 1.0,      // Default
      'analysis': 0.8,     // Analysis might become outdated faster
      'calculation': 0.5   // Calculations might need frequent updates
    };

    const multiplier = categoryMultipliers[category] || 1.0;
    return Math.floor(baseTTL * multiplier);
  }

  /**
   * Invalidate cache entry or pattern
   */
  async invalidate(keyOrPattern: string, isPattern: boolean = false): Promise<void> {
    try {
      if (isPattern) {
        // Invalidate by pattern (for bulk invalidation)
        const { data } = await this.supabase
          .from('query_cache')
          .select('key')
          .like('query', `%${keyOrPattern}%`);

        if (data) {
          const keys = data.map(item => item.key);
          
          // Remove from memory cache
          keys.forEach(key => this.memoryCache.delete(key));
          
          // Remove from database
          await this.supabase
            .from('query_cache')
            .delete()
            .in('key', keys);
        }
      } else {
        // Invalidate single entry
        this.memoryCache.delete(keyOrPattern);
        await this.supabase
          .from('query_cache')
          .delete()
          .eq('key', keyOrPattern);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Bulk invalidate by category
   */
  async invalidateByCategory(category: string): Promise<void> {
    try {
      // Remove from memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.category === category) {
          this.memoryCache.delete(key);
        }
      }

      // Remove from database
      await this.supabase
        .from('query_cache')
        .delete()
        .eq('category', category);
    } catch (error) {
      console.error('Bulk invalidation error:', error);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanupExpired(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isValid(entry)) {
          this.memoryCache.delete(key);
        }
      }

      // Clean database cache
      await this.supabase
        .from('query_cache')
        .delete()
        .or(`timestamp.lt.${new Date(now.getTime() - this.config.defaultTTL).toISOString()},last_accessed.lt.${new Date(now.getTime() - (this.config.defaultTTL / 2)).toISOString()}`);

    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    const lastAccessedAge = now - entry.lastAccessed.getTime();
    
    // Entry is valid if within TTL and recently accessed
    return age < entry.ttl && lastAccessedAge < entry.ttl;
  }

  /**
   * Add entry to memory cache with intelligent eviction
   */
  private addToMemoryCache(entry: CacheEntry): void {
    // Remove least recently used entries if cache is full
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      const entries = Array.from(this.memoryCache.entries());
      
      // Sort by last accessed time and hit count (LRU + LFU hybrid)
      entries.sort((a, b) => {
        const scoreA = a[1].hitCount * 0.7 + (a[1].lastAccessed.getTime() * 0.3);
        const scoreB = b[1].hitCount * 0.7 + (b[1].lastAccessed.getTime() * 0.3);
        return scoreA - scoreB;
      });

      // Remove bottom 10% of entries
      const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }

    this.memoryCache.set(entry.key, entry);
    this.metrics.memoryEntries = this.memoryCache.size;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(type: 'hit' | 'miss', responseTime: number): void {
    if (!this.config.enableMetrics) return;

    if (type === 'hit') {
      this.metrics.totalHits++;
    } else {
      this.metrics.totalMisses++;
    }

    const total = this.metrics.totalHits + this.metrics.totalMisses;
    this.metrics.hitRate = this.metrics.totalHits / total;
    this.metrics.missRate = this.metrics.totalMisses / total;
    
    // Rolling average for response time
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    
    // Cache effectiveness = hit rate weighted by confidence
    this.metrics.cacheEffectiveness = this.metrics.hitRate * 0.8 + 
      (this.metrics.totalHits > 0 ? 1.0 : 0.0) * 0.2;
  }

  /**
   * Get comprehensive cache statistics
   */
  getMetrics(): CacheMetrics & {
    detailedStats: {
      categoryDistribution: Record<string, number>;
      confidenceDistribution: Record<string, number>;
      topQueries: Array<{ query: string; hits: number; confidence: number }>;
    }
  } {
    const categoryDistribution: Record<string, number> = {};
    const confidenceDistribution: Record<string, number> = {};
    const topQueries: Array<{ query: string; hits: number; confidence: number }> = [];

    // Analyze memory cache for quick stats
    for (const entry of this.memoryCache.values()) {
      categoryDistribution[entry.category] = (categoryDistribution[entry.category] || 0) + 1;
      
      const confidenceBucket = Math.floor(entry.confidence * 10) / 10;
      const confidenceKey = `${confidenceBucket.toFixed(1)}+`;
      confidenceDistribution[confidenceKey] = (confidenceDistribution[confidenceKey] || 0) + 1;

      topQueries.push({
        query: entry.query.substring(0, 100) + (entry.query.length > 100 ? '...' : ''),
        hits: entry.hitCount,
        confidence: entry.confidence
      });
    }

    topQueries.sort((a, b) => b.hits - a.hits).splice(10); // Keep top 10

    return {
      ...this.metrics,
      memoryEntries: this.memoryCache.size,
      detailedStats: {
        categoryDistribution,
        confidenceDistribution,
        topQueries
      }
    };
  }

  /**
   * Initialize cache and load popular queries
   */
  private async initializeCache(): Promise<void> {
    try {
      // Load most popular queries into memory
      const { data } = await this.supabase
        .from('query_cache')
        .select('*')
        .order('hit_count', { ascending: false })
        .order('confidence', { ascending: false })
        .limit(this.config.maxMemoryEntries / 2);

      if (data) {
        data.forEach((item: any) => {
          const entry: CacheEntry = {
            key: item.key,
            query: item.query,
            response: item.response,
            confidence: item.confidence,
            category: item.category,
            timestamp: new Date(item.timestamp),
            lastAccessed: new Date(item.last_accessed),
            hitCount: item.hit_count,
            ttl: item.ttl || this.config.defaultTTL,
            metadata: item.metadata
          };

          if (this.isValid(entry)) {
            this.memoryCache.set(entry.key, entry);
          }
        });
      }

      // Schedule periodic cleanup
      setInterval(() => {
        this.cleanupExpired();
      }, 10 * 60 * 1000); // Every 10 minutes

    } catch (error) {
      console.error('Cache initialization error:', error);
    }
  }
}

// Singleton pattern for global cache instance
let globalCacheInstance: EnhancedQueryCache | null = null;

export function getEnhancedCache(
  supabaseUrl: string, 
  supabaseKey: string, 
  config?: Partial<CacheConfig>
): EnhancedQueryCache {
  if (!globalCacheInstance) {
    globalCacheInstance = new EnhancedQueryCache(supabaseUrl, supabaseKey, config);
  }
  return globalCacheInstance;
}

// Cache middleware factory
export function createCacheMiddleware(cache: EnhancedQueryCache) {
  return async function cacheMiddleware(
    request: {
      query: string;
      context?: any;
      category?: string;
    },
    handler: (req: any) => Promise<{
      response: string;
      confidence: number;
    }>
  ): Promise<{
    response: string;
    confidence: number;
    cached: boolean;
    cacheKey?: string;
  }> {
    const startTime = Date.now();
    
    // Try to get cached response
    const cached = await cache.get(request.query, request.context);
    if (cached) {
      return {
        response: cached.response,
        confidence: cached.confidence,
        cached: true,
        cacheKey: cached.key
      };
    }

    // Execute handler if not cached
    const result = await handler(request);
    
    // Cache the result
    await cache.set(
      request.query,
      result.response,
      result.confidence,
      request.category || 'general',
      request.context,
      undefined,
      {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    );

    return {
      ...result,
      cached: false
    };
  };
}