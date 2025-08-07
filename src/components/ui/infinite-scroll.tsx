import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InfiniteScrollProps {
  hasNext: boolean;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onLoadMore: () => void;
  onRetry?: () => void;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
  loadingComponent?: React.ReactNode;
  endMessage?: React.ReactNode;
  showLoadMoreButton?: boolean;
}

export function InfiniteScroll({
  hasNext,
  isLoading,
  isError = false,
  errorMessage = 'Erro ao carregar mais itens',
  onLoadMore,
  onRetry,
  threshold = 200,
  children,
  className,
  loadingComponent,
  endMessage,
  showLoadMoreButton = false
}: InfiniteScrollProps) {
  const observerRef = useRef<HTMLDivElement>(null);
  const lastElementRef = useRef<HTMLDivElement>(null);

  // Intersection Observer callback
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      
      if (target.isIntersecting && hasNext && !isLoading && !isError) {
        onLoadMore();
      }
    },
    [hasNext, isLoading, isError, onLoadMore]
  );

  // Set up Intersection Observer
  useEffect(() => {
    const element = observerRef.current;
    if (!element || showLoadMoreButton) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold: 0.1,
      rootMargin: `${threshold}px`,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [handleIntersect, threshold, showLoadMoreButton]);

  // Handle scroll-based loading (fallback for older browsers)
  useEffect(() => {
    if (showLoadMoreButton) return;
    if (!('IntersectionObserver' in window)) {
      const handleScroll = () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const clientHeight = document.documentElement.clientHeight || window.innerHeight;
        
        if (scrollTop + clientHeight >= scrollHeight - threshold && hasNext && !isLoading && !isError) {
          onLoadMore();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      }
    }
  }, [hasNext, isLoading, isError, onLoadMore, threshold, showLoadMoreButton]);

  const defaultLoadingComponent = (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando mais itens...</span>
      </div>
    </div>
  );

  const defaultEndMessage = (
    <div className="flex items-center justify-center py-8">
      <div className="text-center text-muted-foreground">
        <div className="text-sm">✨ Você chegou ao final!</div>
        <div className="text-xs mt-1">Não há mais itens para carregar.</div>
      </div>
    </div>
  );

  const errorComponent = (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-destructive mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{errorMessage}</span>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );

  const loadMoreButton = (
    <div className="flex items-center justify-center py-6">
      <Button
        onClick={onLoadMore}
        disabled={isLoading || isError}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </>
        ) : (
          'Carregar mais'
        )}
      </Button>
    </div>
  );

  return (
    <div className={cn('relative', className)}>
      {children}
      
      {/* Infinite scroll trigger element (invisible) */}
      {!showLoadMoreButton && (
        <div
          ref={observerRef}
          className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
          aria-hidden="true"
        />
      )}
      
      {/* Status indicators */}
      {isError && errorComponent}
      
      {!isError && isLoading && (loadingComponent || defaultLoadingComponent)}
      
      {!isError && !isLoading && hasNext && showLoadMoreButton && loadMoreButton}
      
      {!isError && !isLoading && !hasNext && (endMessage || defaultEndMessage)}
      
      {/* Last element reference for additional tracking */}
      <div ref={lastElementRef} className="h-0" aria-hidden="true" />
    </div>
  );
}

// Hook for infinite scroll state management
export function useInfiniteScroll<T>() {
  const [data, setData] = React.useState<T[]>([]);
  const [hasNext, setHasNext] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>();

  const loadMore = useCallback(async (
    loadFunction: (cursor?: string) => Promise<{
      data: T[];
      hasNext: boolean;
      nextCursor?: string;
    }>
  ) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsError(false);
    
    try {
      const result = await loadFunction(cursor);
      
      setData(prev => [...prev, ...result.data]);
      setHasNext(result.hasNext);
      setCursor(result.nextCursor);
    } catch (error) {
      setIsError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading]);

  const reset = useCallback(() => {
    setData([]);
    setHasNext(true);
    setIsLoading(false);
    setIsError(false);
    setErrorMessage('');
    setCursor(undefined);
  }, []);

  const retry = useCallback(async (
    loadFunction: (cursor?: string) => Promise<{
      data: T[];
      hasNext: boolean;
      nextCursor?: string;
    }>
  ) => {
    await loadMore(loadFunction);
  }, [loadMore]);

  return {
    data,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    loadMore,
    reset,
    retry: (loadFunction: (cursor?: string) => Promise<{
      data: T[];
      hasNext: boolean;
      nextCursor?: string;
    }>) => retry(loadFunction),
  };
}