import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCacheMiddleware, CacheUtils } from "../shared/cache-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CursorPaginationRequest {
  query?: string;
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  filters?: {
    type?: string[];
    domain?: string[];
    tags?: string[];
    is_public?: boolean;
  };
  userRole?: string;
}

interface CursorResponse<T> {
  data: T[];
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
    totalEstimate?: number;
  };
  metadata: {
    fromCache: boolean;
    cacheMetrics: any;
    searchType: string;
    performance: {
      queryTime: number;
      recordsProcessed: number;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = performance.now();
    const { 
      query, 
      cursor, 
      limit = 20, 
      direction = 'next', 
      sort = { field: 'created_at', direction: 'desc' },
      filters,
      userRole 
    }: CursorPaginationRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize cache middleware
    const cacheMiddleware = createCacheMiddleware(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        defaultTTL: 5 * 60 * 1000, // 5 minutes for cursor results (shorter due to real-time nature)
        enableVectorSearchCache: true,
        enableMetrics: true,
        cacheKeyPrefix: 'pdpoa_cursor_pagination'
      }
    );

    // Validate and sanitize inputs
    const safeLimit = Math.min(50, Math.max(5, limit)); // Min 5, Max 50 for performance

    // Parse cursor if provided
    let cursorData: any = null;
    if (cursor) {
      try {
        const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
        cursorData = JSON.parse(decodedCursor);
      } catch (error) {
        console.error('Invalid cursor format:', error);
        // Continue without cursor (will start from beginning)
      }
    }

    // Build cache key
    const cacheKey = {
      query: query || '',
      cursor: cursor || '',
      limit: safeLimit,
      direction,
      sort,
      filters: filters || {},
      userRole: userRole || 'citizen'
    };

    // Execute cursor-based search with cache
    const searchResult = await cacheMiddleware.cacheResponse(
      cacheKey,
      async () => {
        // Build base query
        let documentsQuery = supabaseClient
          .from('documents')
          .select('*');

        // Apply user role filter
        if (userRole === 'citizen') {
          documentsQuery = documentsQuery.eq('is_public', true);
        }

        // Apply text search if query provided
        if (query && query.trim()) {
          documentsQuery = documentsQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);
        }

        // Apply filters
        if (filters) {
          if (filters.type && filters.type.length > 0) {
            documentsQuery = documentsQuery.in('type', filters.type);
          }
          if (filters.domain && filters.domain.length > 0) {
            documentsQuery = documentsQuery.in('domain', filters.domain);
          }
          if (filters.tags && filters.tags.length > 0) {
            documentsQuery = documentsQuery.contains('tags', filters.tags);
          }
          if (filters.is_public !== undefined) {
            documentsQuery = documentsQuery.eq('is_public', filters.is_public);
          }
        }

        // Apply cursor-based filtering
        if (cursorData) {
          const { field, value, direction: cursorDirection } = cursorData;
          
          if (direction === 'next') {
            // For next page, continue from where we left off
            if (sort.direction === 'asc') {
              documentsQuery = documentsQuery.gt(field, value);
            } else {
              documentsQuery = documentsQuery.lt(field, value);
            }
          } else {
            // For previous page, reverse the condition
            if (sort.direction === 'asc') {
              documentsQuery = documentsQuery.lt(field, value);
            } else {
              documentsQuery = documentsQuery.gt(field, value);
            }
          }
        }

        // Apply sorting
        const sortField = sort?.field || 'created_at';
        const sortDirection = sort?.direction || 'desc';
        
        // For 'prev' direction, we need to reverse the sort to get the previous items
        const actualSortDirection = direction === 'prev' ? 
          (sortDirection === 'asc' ? 'desc' : 'asc') : 
          sortDirection;
          
        documentsQuery = documentsQuery.order(sortField, { ascending: actualSortDirection === 'asc' });

        // Apply limit (get one extra to check if there are more)
        documentsQuery = documentsQuery.limit(safeLimit + 1);

        // Execute query
        const { data: documents, error: searchError } = await documentsQuery;

        if (searchError) {
          console.error('Error in cursor-based search:', searchError);
          throw searchError;
        }

        let results = documents || [];
        
        // If we're going backwards, reverse the results to maintain proper order
        if (direction === 'prev') {
          results = results.reverse();
        }

        // Check if there are more results
        const hasMore = results.length > safeLimit;
        if (hasMore) {
          results = results.slice(0, safeLimit); // Remove the extra item
        }

        // Determine hasNext and hasPrev
        let hasNext = false;
        let hasPrev = false;

        if (direction === 'next') {
          hasNext = hasMore;
          hasPrev = !!cursor; // If we have a cursor, we can go back
        } else {
          hasNext = !!cursor; // If we have a cursor, we can go forward
          hasPrev = hasMore;
        }

        // Generate new cursors
        let nextCursor: string | undefined;
        let prevCursor: string | undefined;

        if (results.length > 0) {
          if (hasNext) {
            nextCursor = Buffer.from(JSON.stringify({
              id: results[results.length - 1].id,
              field: sortField,
              value: results[results.length - 1][sortField],
              direction: sortDirection
            })).toString('base64');
          }
          
          if (hasPrev) {
            prevCursor = Buffer.from(JSON.stringify({
              id: results[0].id,
              field: sortField,
              value: results[0][sortField],
              direction: sortDirection
            })).toString('base64');
          }
        }

        // Estimate total count (expensive operation, so we do a separate lightweight query)
        let totalEstimate: number | undefined;
        try {
          let countQuery = supabaseClient
            .from('documents')
            .select('id', { count: 'estimated' });

          // Apply same filters for count
          if (userRole === 'citizen') {
            countQuery = countQuery.eq('is_public', true);
          }
          if (query && query.trim()) {
            countQuery = countQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);
          }
          if (filters) {
            if (filters.type && filters.type.length > 0) {
              countQuery = countQuery.in('type', filters.type);
            }
            if (filters.domain && filters.domain.length > 0) {
              countQuery = countQuery.in('domain', filters.domain);
            }
            if (filters.is_public !== undefined) {
              countQuery = countQuery.eq('is_public', filters.is_public);
            }
          }

          const { count } = await countQuery;
          totalEstimate = count || undefined;
        } catch (countError) {
          console.warn('Could not estimate total count:', countError);
          // Continue without total estimate
        }

        return {
          data: results,
          pagination: {
            hasNext,
            hasPrev,
            nextCursor,
            prevCursor,
            totalEstimate
          },
          recordsProcessed: results.length
        };
      }
    );

    const queryTime = performance.now() - startTime;
    const cacheMetrics = cacheMiddleware.getCacheMetrics();
    
    // Log cache performance
    if (searchResult.fromCache) {
      console.log(`🎯 Cursor pagination cache HIT`);
    }
    CacheUtils.logCachePerformance(cacheMetrics, 'cursor-pagination');

    const response: CursorResponse<any> = {
      data: searchResult.data,
      pagination: searchResult.pagination,
      metadata: {
        fromCache: searchResult.fromCache,
        cacheMetrics: {
          hitRate: (cacheMetrics.hitRate * 100).toFixed(1) + '%',
          totalEntries: cacheMetrics.totalEntries
        },
        searchType: query ? 'cursor_text_search' : 'cursor_browse',
        performance: {
          queryTime: Math.round(queryTime),
          recordsProcessed: searchResult.recordsProcessed
        }
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cursor pagination error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      data: [],
      pagination: {
        hasNext: false,
        hasPrev: false
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});