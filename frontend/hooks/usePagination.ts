import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationFilters {
  type?: string[];
  domain?: string[];
  tags?: string[];
  is_public?: boolean;
}

export interface PaginationSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSort?: PaginationSort;
  enableCache?: boolean;
  cacheKeyPrefix?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: PaginationState;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  
  // Actions
  goToPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sort: PaginationSort) => void;
  setFilters: (filters: PaginationFilters) => void;
  search: (query: string) => void;
  refresh: () => void;
  reset: () => void;
}

export function usePagination<T = any>(
  endpoint: string,
  options: UsePaginationOptions = {}
): PaginationResult<T> {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialSort = { field: 'created_at', direction: 'desc' },
    enableCache = true,
    cacheKeyPrefix = 'pagination'
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFiltersState] = useState<PaginationFilters>({});
  const [sort, setSortState] = useState<PaginationSort>(initialSort);
  const [query, setQuery] = useState<string>('');

  // Cache for storing results
  const [cache, setCache] = useState<Map<string, any>>(new Map());

  // Generate cache key
  const generateCacheKey = useCallback((
    page: number,
    limit: number,
    filters: PaginationFilters,
    sort: PaginationSort,
    query: string
  ) => {
    return `${cacheKeyPrefix}_${endpoint}_${JSON.stringify({
      page,
      limit,
      filters,
      sort,
      query
    })}`;
  }, [cacheKeyPrefix, endpoint]);

  // Fetch data function
  const fetchData = useCallback(async (
    page: number,
    limit: number,
    currentFilters: PaginationFilters,
    currentSort: PaginationSort,
    currentQuery: string
  ) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Check cache first
      const cacheKey = generateCacheKey(page, limit, currentFilters, currentSort, currentQuery);
      
      if (enableCache && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setData(cachedResult.data);
        setPagination(cachedResult.pagination);
        setIsLoading(false);
        return;
      }

      // Call Supabase Edge Function for paginated search
      const { data: result, error: fetchError } = await supabase.functions.invoke(endpoint, {
        body: {
          query: currentQuery,
          filters: currentFilters,
          pagination: {
            page,
            limit,
            sort: currentSort
          }
        }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!result) {
        throw new Error('No data received from server');
      }

      const { data: items, pagination: paginationInfo } = result;

      setData(items || []);
      setPagination(paginationInfo);

      // Cache the result
      if (enableCache) {
        const newCache = new Map(cache);
        newCache.set(cacheKey, { data: items, pagination: paginationInfo });
        
        // Limit cache size (keep last 50 entries)
        if (newCache.size > 50) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        
        setCache(newCache);
      }

    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enableCache, cache, generateCacheKey]);

  // Load data when dependencies change
  const loadCurrentData = useCallback(() => {
    fetchData(pagination.page, pagination.limit, filters, sort, query);
  }, [fetchData, pagination.page, pagination.limit, filters, sort, query]);

  // Actions
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchData(page, pagination.limit, filters, sort, query);
  }, [fetchData, pagination.limit, filters, sort, query]);

  const setLimit = useCallback((limit: number) => {
    const newPage = 1; // Reset to first page when changing limit
    setPagination(prev => ({ ...prev, page: newPage, limit }));
    fetchData(newPage, limit, filters, sort, query);
  }, [fetchData, filters, sort, query]);

  const setSort = useCallback((newSort: PaginationSort) => {
    setSortState(newSort);
    const newPage = 1; // Reset to first page when changing sort
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchData(newPage, pagination.limit, filters, newSort, query);
  }, [fetchData, pagination.limit, filters, query]);

  const setFilters = useCallback((newFilters: PaginationFilters) => {
    setFiltersState(newFilters);
    const newPage = 1; // Reset to first page when changing filters
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchData(newPage, pagination.limit, newFilters, sort, query);
  }, [fetchData, pagination.limit, sort, query]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    const newPage = 1; // Reset to first page when searching
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchData(newPage, pagination.limit, filters, sort, searchQuery);
  }, [fetchData, pagination.limit, filters, sort]);

  const refresh = useCallback(() => {
    // Clear cache for current key
    if (enableCache) {
      const cacheKey = generateCacheKey(pagination.page, pagination.limit, filters, sort, query);
      const newCache = new Map(cache);
      newCache.delete(cacheKey);
      setCache(newCache);
    }
    
    loadCurrentData();
  }, [enableCache, generateCacheKey, pagination.page, pagination.limit, filters, sort, query, cache, loadCurrentData]);

  const reset = useCallback(() => {
    setData([]);
    setPagination({
      page: initialPage,
      limit: initialLimit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    });
    setFiltersState({});
    setSortState(initialSort);
    setQuery('');
    setIsError(false);
    setError(null);
    setCache(new Map());
  }, [initialPage, initialLimit, initialSort]);

  // Memoized result
  const result = useMemo(() => ({
    data,
    pagination,
    isLoading,
    isError,
    error,
    goToPage,
    setLimit,
    setSort,
    setFilters,
    search,
    refresh,
    reset
  }), [
    data,
    pagination,
    isLoading,
    isError,
    error,
    goToPage,
    setLimit,
    setSort,
    setFilters,
    search,
    refresh,
    reset
  ]);

  return result;
}

// Cursor-based pagination hook
export function useCursorPagination<T = any>(
  endpoint: string,
  options: Omit<UsePaginationOptions, 'initialPage'> & {
    initialCursor?: string;
  } = {}
) {
  const {
    initialLimit = 20,
    initialSort = { field: 'created_at', direction: 'desc' },
    initialCursor,
    enableCache = true,
    cacheKeyPrefix = 'cursor_pagination'
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [prevCursor, setPrevCursor] = useState<string | undefined>();
  
  const [filters, setFiltersState] = useState<PaginationFilters>({});
  const [sort, setSortState] = useState<PaginationSort>(initialSort);
  const [query, setQuery] = useState<string>('');
  const [limit, setLimitState] = useState(initialLimit);

  // Fetch data function
  const fetchData = useCallback(async (
    currentCursor: string | undefined,
    direction: 'next' | 'prev',
    currentFilters: PaginationFilters,
    currentSort: PaginationSort,
    currentQuery: string,
    currentLimit: number
  ) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const { data: result, error: fetchError } = await supabase.functions.invoke(endpoint, {
        body: {
          query: currentQuery,
          cursor: currentCursor,
          limit: currentLimit,
          direction,
          sort: currentSort,
          filters: currentFilters
        }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!result) {
        throw new Error('No data received from server');
      }

      const { data: items, pagination: paginationInfo } = result;

      setData(items || []);
      setHasNext(paginationInfo.hasNext);
      setHasPrev(paginationInfo.hasPrev);
      setNextCursor(paginationInfo.nextCursor);
      setPrevCursor(paginationInfo.prevCursor);

    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData([]);
      setHasNext(false);
      setHasPrev(false);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  // Actions
  const goNext = useCallback(() => {
    if (hasNext && nextCursor) {
      setCursor(nextCursor);
      fetchData(nextCursor, 'next', filters, sort, query, limit);
    }
  }, [hasNext, nextCursor, fetchData, filters, sort, query, limit]);

  const goPrev = useCallback(() => {
    if (hasPrev && prevCursor) {
      setCursor(prevCursor);
      fetchData(prevCursor, 'prev', filters, sort, query, limit);
    }
  }, [hasPrev, prevCursor, fetchData, filters, sort, query, limit]);

  const reset = useCallback(() => {
    setCursor(initialCursor);
    setData([]);
    setHasNext(false);
    setHasPrev(false);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setFiltersState({});
    setSortState(initialSort);
    setQuery('');
    setLimitState(initialLimit);
    setIsError(false);
    setError(null);
  }, [initialCursor, initialSort, initialLimit]);

  const refresh = useCallback(() => {
    fetchData(cursor, 'next', filters, sort, query, limit);
  }, [fetchData, cursor, filters, sort, query, limit]);

  const setFilters = useCallback((newFilters: PaginationFilters) => {
    setFiltersState(newFilters);
    setCursor(undefined);
    fetchData(undefined, 'next', newFilters, sort, query, limit);
  }, [fetchData, sort, query, limit]);

  const setSort = useCallback((newSort: PaginationSort) => {
    setSortState(newSort);
    setCursor(undefined);
    fetchData(undefined, 'next', filters, newSort, query, limit);
  }, [fetchData, filters, query, limit]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setCursor(undefined);
    fetchData(undefined, 'next', filters, sort, searchQuery, limit);
  }, [fetchData, filters, sort, limit]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setCursor(undefined);
    fetchData(undefined, 'next', filters, sort, query, newLimit);
  }, [fetchData, filters, sort, query]);

  return {
    data,
    isLoading,
    isError,
    error,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    setFilters,
    setSort,
    search,
    setLimit,
    refresh,
    reset
  };
}