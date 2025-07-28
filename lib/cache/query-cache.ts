import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface CacheEntry {
  key: string;
  query: string;
  response: string;
  confidence: number;
  timestamp: Date;
  hitCount: number;
  category: string;
}

export class QueryCache {
  private supabase: any;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly maxMemoryCacheSize = 100;
  private readonly cacheExpirationMs = 15 * 60 * 1000; // 15 minutes

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.loadPopularQueries();
  }

  /**
   * Generate a cache key from query and context
   */
  private generateCacheKey(query: string, context?: any): string {
    const normalizedQuery = query.toLowerCase().trim();
    const contextString = context ? JSON.stringify(context) : '';
    return crypto
      .createHash('md5')
      .update(normalizedQuery + contextString)
      .digest('hex');
  }

  /**
   * Get cached response if available
   */
  async get(query: string, context?: any): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(query, context);
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      memoryEntry.hitCount++;
      return memoryEntry;
    }

    // Check database cache
    try {
      const { data, error } = await this.supabase
        .from('query_cache')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) return null;

      const entry: CacheEntry = {
        key: data.key,
        query: data.query,
        response: data.response,
        confidence: data.confidence,
        timestamp: new Date(data.timestamp),
        hitCount: data.hit_count + 1,
        category: data.category
      };

      if (this.isValid(entry)) {
        // Update hit count in database
        await this.supabase
          .from('query_cache')
          .update({ hit_count: entry.hitCount, last_accessed: new Date() })
          .eq('key', key);

        // Add to memory cache
        this.addToMemoryCache(entry);
        
        return entry;
      } else {
        // Remove expired entry
        await this.remove(key);
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache entry
   */
  async set(query: string, response: string, confidence: number, category: string, context?: any): Promise<void> {
    // Only cache high-confidence responses
    if (confidence < 0.7) return;
    
    // Don't cache beta messages
    if (response.includes('versão Beta')) return;

    const key = this.generateCacheKey(query, context);
    const entry: CacheEntry = {
      key,
      query,
      response,
      confidence,
      timestamp: new Date(),
      hitCount: 0,
      category
    };

    try {
      // Store in database
      await this.supabase
        .from('query_cache')
        .upsert({
          key: entry.key,
          query: entry.query,
          response: entry.response,
          confidence: entry.confidence,
          category: entry.category,
          timestamp: entry.timestamp,
          hit_count: entry.hitCount,
          last_accessed: entry.timestamp
        });

      // Add to memory cache
      this.addToMemoryCache(entry);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Remove cache entry
   */
  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    try {
      await this.supabase
        .from('query_cache')
        .delete()
        .eq('key', key);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      await this.supabase
        .from('query_cache')
        .delete()
        .neq('key', ''); // Delete all
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp.getTime();
    return age < this.cacheExpirationMs;
  }

  /**
   * Add entry to memory cache with LRU eviction
   */
  private addToMemoryCache(entry: CacheEntry): void {
    // Remove oldest entry if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0][0];
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(entry.key, entry);
  }

  /**
   * Load popular queries into memory cache on startup
   */
  private async loadPopularQueries(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('query_cache')
        .select('*')
        .order('hit_count', { ascending: false })
        .limit(50);

      if (data) {
        data.forEach((item: any) => {
          const entry: CacheEntry = {
            key: item.key,
            query: item.query,
            response: item.response,
            confidence: item.confidence,
            timestamp: new Date(item.timestamp),
            hitCount: item.hit_count,
            category: item.category
          };

          if (this.isValid(entry)) {
            this.memoryCache.set(entry.key, entry);
          }
        });
      }
    } catch (error) {
      console.error('Error loading popular queries:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    totalCacheEntries: number;
    hitRate: number;
    popularQueries: Array<{ query: string; hitCount: number }>;
    categoryCounts: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('query_cache')
        .select('*');

      if (error || !data) {
        return {
          memoryCacheSize: this.memoryCache.size,
          totalCacheEntries: 0,
          hitRate: 0,
          popularQueries: [],
          categoryCounts: {}
        };
      }

      const totalHits = data.reduce((sum, entry) => sum + entry.hit_count, 0);
      const totalQueries = totalHits + data.length; // Approximation

      const popularQueries = data
        .sort((a, b) => b.hit_count - a.hit_count)
        .slice(0, 10)
        .map(entry => ({
          query: entry.query,
          hitCount: entry.hit_count
        }));

      const categoryCounts = data.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        memoryCacheSize: this.memoryCache.size,
        totalCacheEntries: data.length,
        hitRate: totalQueries > 0 ? totalHits / totalQueries : 0,
        popularQueries,
        categoryCounts
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        memoryCacheSize: this.memoryCache.size,
        totalCacheEntries: 0,
        hitRate: 0,
        popularQueries: [],
        categoryCounts: {}
      };
    }
  }
}

// Singleton instance
let cacheInstance: QueryCache | null = null;

export function getQueryCache(supabaseUrl: string, supabaseKey: string): QueryCache {
  if (!cacheInstance) {
    cacheInstance = new QueryCache(supabaseUrl, supabaseKey);
  }
  return cacheInstance;
}