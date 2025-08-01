import { renderHook, act, waitFor } from '@testing-library/react';
import { usePagination, useCursorPagination } from '../usePagination';

// Mock Supabase client
const mockSupabase = {
  functions: {
    invoke: jest.fn()
  }
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('usePagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePagination('test-endpoint'));

    expect(result.current.data).toEqual([]);
    expect(result.current.pagination.page).toBe(1);
    expect(result.current.pagination.limit).toBe(20);
    expect(result.current.pagination.total).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('initializes with custom options', () => {
    const { result } = renderHook(() => 
      usePagination('test-endpoint', {
        initialPage: 2,
        initialLimit: 50
      })
    );

    expect(result.current.pagination.page).toBe(2);
    expect(result.current.pagination.limit).toBe(50);
  });

  it('handles successful data loading', async () => {
    const mockData = [
      { id: 1, title: 'Document 1' },
      { id: 2, title: 'Document 2' }
    ];

    const mockResponse = {
      data: mockData,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    await act(async () => {
      result.current.goToPage(1);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.pagination.total).toBe(2);
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('test-endpoint', {
      body: {
        query: '',
        filters: {},
        pagination: {
          page: 1,
          limit: 20,
          sort: { field: 'created_at', direction: 'desc' }
        }
      }
    });
  });

  it('handles loading error', async () => {
    const errorMessage = 'Network error';
    mockSupabase.functions.invoke.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => usePagination('test-endpoint'));

    await act(async () => {
      result.current.goToPage(1);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toEqual([]);
  });

  it('handles page changes correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    await act(async () => {
      result.current.goToPage(2);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagination.page).toBe(2);
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('test-endpoint', {
      body: {
        query: '',
        filters: {},
        pagination: {
          page: 2,
          limit: 20,
          sort: { field: 'created_at', direction: 'desc' }
        }
      }
    });
  });

  it('handles limit changes correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    await act(async () => {
      result.current.setLimit(50);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagination.limit).toBe(50);
    expect(result.current.pagination.page).toBe(1); // Should reset to page 1
  });

  it('handles search correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    await act(async () => {
      result.current.search('test query');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('test-endpoint', {
      body: {
        query: 'test query',
        filters: {},
        pagination: {
          page: 1,
          limit: 20,
          sort: { field: 'created_at', direction: 'desc' }
        }
      }
    });
  });

  it('handles filters correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    const filters = {
      type: ['PDF'],
      domain: ['technical']
    };

    await act(async () => {
      result.current.setFilters(filters);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('test-endpoint', {
      body: {
        query: '',
        filters,
        pagination: {
          page: 1,
          limit: 20,
          sort: { field: 'created_at', direction: 'desc' }
        }
      }
    });
  });

  it('handles sorting correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => usePagination('test-endpoint'));

    const sort = { field: 'title', direction: 'asc' as const };

    await act(async () => {
      result.current.setSort(sort);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('test-endpoint', {
      body: {
        query: '',
        filters: {},
        pagination: {
          page: 1,
          limit: 20,
          sort
        }
      }
    });
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => usePagination('test-endpoint', {
      initialPage: 2,
      initialLimit: 50
    }));

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.pagination.page).toBe(2); // Back to initial
    expect(result.current.pagination.limit).toBe(50); // Back to initial
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

describe('useCursorPagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useCursorPagination('cursor-endpoint'));

    expect(result.current.data).toEqual([]);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('handles successful data loading', async () => {
    const mockData = [
      { id: 1, title: 'Document 1' },
      { id: 2, title: 'Document 2' }
    ];

    const mockResponse = {
      data: mockData,
      pagination: {
        hasNext: true,
        hasPrev: false,
        nextCursor: 'next-cursor',
        prevCursor: undefined
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => useCursorPagination('cursor-endpoint'));

    await act(async () => {
      result.current.goNext();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrev).toBe(false);
  });

  it('handles cursor navigation correctly', async () => {
    const mockResponse = {
      data: [],
      pagination: {
        hasNext: true,
        hasPrev: true,
        nextCursor: 'next-cursor',
        prevCursor: 'prev-cursor'
      }
    };

    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: mockResponse,
      error: null
    });

    const { result } = renderHook(() => useCursorPagination('cursor-endpoint'));

    await act(async () => {
      result.current.goNext();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('cursor-endpoint', {
      body: {
        query: '',
        cursor: undefined,
        limit: 20,
        direction: 'next',
        sort: { field: 'created_at', direction: 'desc' },
        filters: {}
      }
    });
  });

  it('handles error correctly', async () => {
    const errorMessage = 'Cursor error';
    mockSupabase.functions.invoke.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useCursorPagination('cursor-endpoint'));

    await act(async () => {
      result.current.goNext();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toEqual([]);
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useCursorPagination('cursor-endpoint', {
      initialLimit: 50
    }));

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });
});