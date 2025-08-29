/**
 * Rate Limit Handler for Embedding Generation
 * Implements retry logic and fallback strategies
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay!;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.message?.includes('Too Many Requests') || 
          error.message?.includes('429') ||
          error.message?.includes('rate limit')) {
        
        if (attempt < opts.maxRetries!) {
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
          await sleep(delay);
          delay = Math.min(delay * opts.backoffFactor!, opts.maxDelay!);
        }
      } else {
        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if we should use cached embeddings
 */
export async function checkEmbeddingCache(
  supabase: any,
  query: string
): Promise<{ cached: boolean; embedding?: number[] }> {
  try {
    // Check if we have a recent cached query with embedding
    const { data: cached } = await supabase
      .from('query_cache')
      .select('embedding')
      .eq('query', query.toLowerCase().trim())
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h cache
      .single();

    if (cached?.embedding) {
      console.log('Using cached embedding for query');
      return { cached: true, embedding: cached.embedding };
    }
  } catch (error) {
    // Cache miss is ok
  }

  return { cached: false };
}

/**
 * Fallback to text search when embeddings fail
 */
export async function fallbackTextSearch(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<any[]> {
  console.log('Falling back to text search due to embedding issues');
  
  // Extract key terms from query
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => `%${word}%`);

  // Search in legal_articles
  const searchPromises = [];
  
  for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
    searchPromises.push(
      supabase
        .from('legal_articles')
        .select('*')
        .or(`full_content.ilike.${keyword},title.ilike.${keyword},article_text.ilike.${keyword}`)
        .limit(Math.ceil(limit / keywords.length))
    );
  }

  const results = await Promise.all(searchPromises);
  const allResults = results.flatMap(r => r.data || []);
  
  // Deduplicate by id
  const uniqueResults = Array.from(
    new Map(allResults.map(item => [item.id, item])).values()
  );

  return uniqueResults.slice(0, limit);
}

/**
 * Smart query handler with rate limit protection
 */
export async function handleQueryWithRateLimit(
  supabase: any,
  query: string,
  generateEmbedding: (text: string) => Promise<number[]>,
  searchWithEmbedding: (embedding: number[]) => Promise<any[]>
): Promise<any[]> {
  // 1. Check cache first
  const { cached, embedding } = await checkEmbeddingCache(supabase, query);
  
  if (cached && embedding) {
    return await searchWithEmbedding(embedding);
  }

  // 2. Try to generate new embedding with retry
  try {
    const newEmbedding = await withRetry(
      () => generateEmbedding(query),
      { maxRetries: 2, initialDelay: 2000 }
    );
    
    // Cache the embedding for future use
    await supabase
      .from('query_cache')
      .upsert({
        query: query.toLowerCase().trim(),
        embedding: newEmbedding,
        created_at: new Date().toISOString()
      });
    
    return await searchWithEmbedding(newEmbedding);
  } catch (error: any) {
    console.error('Embedding generation failed after retries:', error.message);
    
    // 3. Fallback to text search
    return await fallbackTextSearch(supabase, query);
  }
}