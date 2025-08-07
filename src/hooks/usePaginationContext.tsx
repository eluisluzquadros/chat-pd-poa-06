import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Types
export interface PaginationContextState {
  [key: string]: {
    page: number;
    limit: number;
    filters: Record<string, any>;
    sort: {
      field: string;
      direction: 'asc' | 'desc';
    };
    searchQuery: string;
    scrollPosition: number;
    timestamp: number;
  };
}

type PaginationAction =
  | { type: 'SAVE_STATE'; payload: { key: string; state: Omit<PaginationContextState[string], 'timestamp'> } }
  | { type: 'RESTORE_STATE'; payload: { key: string } }
  | { type: 'CLEAR_STATE'; payload: { key: string } }
  | { type: 'CLEAR_OLD_STATES' }
  | { type: 'LOAD_FROM_STORAGE'; payload: PaginationContextState };

// Context
const PaginationContext = createContext<{
  state: PaginationContextState;
  saveState: (key: string, state: Omit<PaginationContextState[string], 'timestamp'>) => void;
  restoreState: (key: string) => PaginationContextState[string] | null;
  clearState: (key: string) => void;
  clearOldStates: () => void;
} | null>(null);

// Reducer
function paginationReducer(
  state: PaginationContextState,
  action: PaginationAction
): PaginationContextState {
  switch (action.type) {
    case 'SAVE_STATE':
      return {
        ...state,
        [action.payload.key]: {
          ...action.payload.state,
          timestamp: Date.now()
        }
      };

    case 'RESTORE_STATE':
      return state;

    case 'CLEAR_STATE':
      const newState = { ...state };
      delete newState[action.payload.key];
      return newState;

    case 'CLEAR_OLD_STATES':
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const filteredState: PaginationContextState = {};
      
      Object.entries(state).forEach(([key, value]) => {
        if (now - value.timestamp < oneHour) {
          filteredState[key] = value;
        }
      });
      
      return filteredState;

    case 'LOAD_FROM_STORAGE':
      return action.payload;

    default:
      return state;
  }
}

// Provider
export function PaginationContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(paginationReducer, {});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pagination-context');
      if (stored) {
        const parsedState = JSON.parse(stored);
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsedState });
        
        // Clean up old states
        dispatch({ type: 'CLEAR_OLD_STATES' });
      }
    } catch (error) {
      console.warn('Failed to load pagination context from localStorage:', error);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('pagination-context', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save pagination context to localStorage:', error);
    }
  }, [state]);

  // Clean up old states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_OLD_STATES' });
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }, []);

  const saveState = useCallback((key: string, newState: Omit<PaginationContextState[string], 'timestamp'>) => {
    dispatch({ type: 'SAVE_STATE', payload: { key, state: newState } });
  }, []);

  const restoreState = useCallback((key: string): PaginationContextState[string] | null => {
    return state[key] || null;
  }, [state]);

  const clearState = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_STATE', payload: { key } });
  }, []);

  const clearOldStates = useCallback(() => {
    dispatch({ type: 'CLEAR_OLD_STATES' });
  }, []);

  return (
    <PaginationContext.Provider value={{
      state,
      saveState,
      restoreState,
      clearState,
      clearOldStates
    }}>
      {children}
    </PaginationContext.Provider>
  );
}

// Hook to use pagination context
export function usePaginationContext() {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error('usePaginationContext must be used within a PaginationContextProvider');
  }
  return context;
}

// Hook for persistent pagination with URL integration
export function usePersistentPagination(
  key: string,
  defaultState: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    searchQuery?: string;
  } = {}
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveState, restoreState, clearState } = usePaginationContext();

  // Generate context key based on route and provided key
  const contextKey = `${location.pathname}_${key}`;

  // Get current scroll position
  const getCurrentScrollPosition = useCallback(() => {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }, []);

  // Restore scroll position
  const restoreScrollPosition = useCallback((position: number) => {
    window.scrollTo({
      top: position,
      behavior: 'smooth'
    });
  }, []);

  // Save current state
  const savePaginationState = useCallback((
    page: number,
    limit: number,
    filters: Record<string, any> = {},
    sort: { field: string; direction: 'asc' | 'desc' } = { field: 'created_at', direction: 'desc' },
    searchQuery: string = ''
  ) => {
    const scrollPosition = getCurrentScrollPosition();
    
    saveState(contextKey, {
      page,
      limit,
      filters,
      sort,
      searchQuery,
      scrollPosition
    });
  }, [contextKey, saveState, getCurrentScrollPosition]);

  // Restore previous state
  const restorePaginationState = useCallback(() => {
    const saved = restoreState(contextKey);
    
    if (saved) {
      // Restore scroll position after a short delay to allow content to load
      setTimeout(() => {
        restoreScrollPosition(saved.scrollPosition);
      }, 100);
      
      return {
        page: saved.page,
        limit: saved.limit,
        filters: saved.filters,
        sort: saved.sort,
        searchQuery: saved.searchQuery
      };
    }
    
    return {
      page: defaultState.page || 1,
      limit: defaultState.limit || 20,
      filters: defaultState.filters || {},
      sort: defaultState.sort || { field: 'created_at', direction: 'desc' },
      searchQuery: defaultState.searchQuery || ''
    };
  }, [contextKey, restoreState, restoreScrollPosition, defaultState]);

  // Clear saved state
  const clearPaginationState = useCallback(() => {
    clearState(contextKey);
  }, [contextKey, clearState]);

  // Check if we're returning from navigation (browser back/forward)
  const isReturningFromNavigation = useCallback(() => {
    const saved = restoreState(contextKey);
    return saved && (Date.now() - saved.timestamp) < 5 * 60 * 1000; // Within 5 minutes
  }, [contextKey, restoreState]);

  return {
    savePaginationState,
    restorePaginationState,
    clearPaginationState,
    isReturningFromNavigation
  };
}

// Hook for URL-based pagination state
export function useUrlPagination() {
  const navigate = useNavigate();
  const location = useLocation();

  const updateUrl = useCallback((params: Record<string, any>) => {
    const searchParams = new URLSearchParams(location.search);
    
    // Update or remove parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        searchParams.delete(key);
      } else {
        searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });

    // Update URL without causing a full page reload
    const newUrl = searchParams.toString() ? `${location.pathname}?${searchParams.toString()}` : location.pathname;
    navigate(newUrl, { replace: true });
  }, [navigate, location]);

  const getFromUrl = useCallback((key: string, defaultValue: any = null) => {
    const searchParams = new URLSearchParams(location.search);
    const value = searchParams.get(key);
    
    if (!value) return defaultValue;
    
    // Handle arrays (comma-separated values)
    if (typeof defaultValue === 'object' && Array.isArray(defaultValue)) {
      return value.split(',');
    }
    
    // Handle numbers
    if (typeof defaultValue === 'number') {
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    }
    
    // Handle booleans
    if (typeof defaultValue === 'boolean') {
      return value === 'true';
    }
    
    // Handle strings
    return value;
  }, [location.search]);

  return {
    updateUrl,
    getFromUrl
  };
}

// Combined hook for complete pagination state management
export function useAdvancedPaginationState(
  key: string,
  options: {
    useUrl?: boolean;
    useContext?: boolean;
    defaultState?: {
      page?: number;
      limit?: number;
      filters?: Record<string, any>;
      sort?: { field: string; direction: 'asc' | 'desc' };
      searchQuery?: string;
    };
  } = {}
) {
  const {
    useUrl = true,
    useContext = true,
    defaultState = {}
  } = options;

  const urlPagination = useUrlPagination();
  const contextPagination = usePersistentPagination(key, defaultState);

  // Determine initial state based on priorities: URL > Context > Default
  const getInitialState = useCallback(() => {
    let state = { ...defaultState };

    // Apply context state if available and enabled
    if (useContext && contextPagination.isReturningFromNavigation()) {
      const contextState = contextPagination.restorePaginationState();
      state = { ...state, ...contextState };
    }

    // Apply URL state if enabled (highest priority)
    if (useUrl) {
      state = {
        ...state,
        page: urlPagination.getFromUrl('page', state.page || 1),
        limit: urlPagination.getFromUrl('limit', state.limit || 20),
        searchQuery: urlPagination.getFromUrl('q', state.searchQuery || '')
      };
    }

    return state;
  }, [useUrl, useContext, defaultState, urlPagination, contextPagination]);

  // Update both URL and context when state changes
  const updateState = useCallback((newState: Partial<{
    page: number;
    limit: number;
    filters: Record<string, any>;
    sort: { field: string; direction: 'asc' | 'desc' };
    searchQuery: string;
  }>) => {
    const currentState = getInitialState();
    const updatedState = { ...currentState, ...newState };

    // Update URL if enabled
    if (useUrl) {
      urlPagination.updateUrl({
        page: updatedState.page !== 1 ? updatedState.page : null,
        limit: updatedState.limit !== 20 ? updatedState.limit : null,
        q: updatedState.searchQuery || null
      });
    }

    // Update context if enabled
    if (useContext) {
      contextPagination.savePaginationState(
        updatedState.page || 1,
        updatedState.limit || 20,
        updatedState.filters || {},
        updatedState.sort || { field: 'created_at', direction: 'desc' },
        updatedState.searchQuery || ''
      );
    }
  }, [useUrl, useContext, urlPagination, contextPagination, getInitialState]);

  // Clear all state
  const clearState = useCallback(() => {
    if (useUrl) {
      urlPagination.updateUrl({
        page: null,
        limit: null,
        q: null
      });
    }
    
    if (useContext) {
      contextPagination.clearPaginationState();
    }
  }, [useUrl, useContext, urlPagination, contextPagination]);

  return {
    getInitialState,
    updateState,
    clearState
  };
}