import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCacheMiddleware, CacheUtils } from "../shared/cache-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaginatedSearchRequest {
  query?: string;
  filters?: {
    type?: string[];
    domain?: string[];
    tags?: string[];
    is_public?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    cursor?: string;
    sort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  userRole?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  metadata: {
    fromCache: boolean;
    cacheMetrics: any;
    searchType: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, pagination, userRole }: PaginatedSearchRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize cache middleware
    const cacheMiddleware = createCacheMiddleware(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        defaultTTL: 10 * 60 * 1000, // 10 minutes for search results
        enableVectorSearchCache: true,
        enableMetrics: true,
        cacheKeyPrefix: 'pdpoa_paginated_search'
      }
    );

    // Validate pagination parameters
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(5, pagination.limit || 20)); // Min 5, Max 100 items per page
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = {
      query: query || '',
      filters: filters || {},
      pagination: { page, limit, sort: pagination.sort },
      userRole: userRole || 'citizen'
    };

    // Execute paginated search with cache
    const searchResult = await cacheMiddleware.cacheResponse(
      cacheKey,
      async () => {
        // Build base query
        let documentsQuery = supabaseClient
          .from('documents')
          .select('*', { count: 'exact' });

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
            // For tags array, we need to use contains
            documentsQuery = documentsQuery.contains('tags', filters.tags);
          }
          if (filters.is_public !== undefined) {
            documentsQuery = documentsQuery.eq('is_public', filters.is_public);
          }
        }

        // Apply sorting
        const sortField = pagination.sort?.field || 'created_at';
        const sortDirection = pagination.sort?.direction || 'desc';
        documentsQuery = documentsQuery.order(sortField, { ascending: sortDirection === 'asc' });

        // Get total count first
        const { count: totalCount, error: countError } = await documentsQuery;
        
        if (countError) {
          console.error('Error getting count:', countError);
          throw countError;
        }

        // Apply pagination
        documentsQuery = documentsQuery.range(offset, offset + limit - 1);

        // Execute query
        const { data: documents, error: searchError } = await documentsQuery;

        if (searchError) {
          console.error('Error in paginated search:', searchError);
          throw searchError;
        }

        // Calculate pagination metadata
        const total = totalCount || 0;
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        // Generate cursors for cursor-based pagination (using ID as cursor)
        let nextCursor: string | undefined;
        let prevCursor: string | undefined;

        if (documents && documents.length > 0) {
          if (hasNext) {
            nextCursor = Buffer.from(JSON.stringify({
              id: documents[documents.length - 1].id,
              field: sortField,
              value: documents[documents.length - 1][sortField],
              direction: sortDirection
            })).toString('base64');
          }
          
          if (hasPrev) {
            prevCursor = Buffer.from(JSON.stringify({
              id: documents[0].id,
              field: sortField,
              value: documents[0][sortField],
              direction: sortDirection === 'asc' ? 'desc' : 'asc' // Reverse direction for previous
            })).toString('base64');
          }
        }

        return {
          data: documents || [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
            nextCursor,
            prevCursor
          }
        };
      }
    );

    const cacheMetrics = cacheMiddleware.getCacheMetrics();
    
    // Log cache performance
    if (searchResult.fromCache) {
      console.log(`🎯 Paginated search cache HIT for page ${page}`);
    }
    CacheUtils.logCachePerformance(cacheMetrics, 'paginated-search');

    const response: PaginatedResponse<any> = {
      data: searchResult.data,
      pagination: searchResult.pagination,
      metadata: {
        fromCache: searchResult.fromCache,
        cacheMetrics: {
          hitRate: (cacheMetrics.hitRate * 100).toFixed(1) + '%',
          totalEntries: cacheMetrics.totalEntries
        },
        searchType: query ? 'text_search' : 'filtered_browse'
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Paginated search error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});