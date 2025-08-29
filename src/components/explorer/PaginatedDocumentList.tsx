import React, { useState, useEffect } from 'react';
import { DocumentCard } from "@/components/DocumentCard";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { InfiniteScroll, useInfiniteScroll } from "@/components/ui/infinite-scroll";
import { usePagination, PaginationFilters, PaginationSort } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/documents";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Grid, List, Loader2 } from "lucide-react";

interface PaginatedDocumentListProps {
  viewMode: "grid" | "list";
  onDocumentDelete: () => void;
  filters?: PaginationFilters;
  searchQuery?: string;
  className?: string;
  enableInfiniteScroll?: boolean;
}

export function PaginatedDocumentList({ 
  viewMode, 
  onDocumentDelete, 
  filters = {},
  searchQuery = '',
  className,
  enableInfiniteScroll = false
}: PaginatedDocumentListProps) {
  const [paginationMode, setPaginationMode] = useState<'traditional' | 'infinite'>(
    enableInfiniteScroll ? 'infinite' : 'traditional'
  );
  
  // Traditional pagination
  const {
    data: documents,
    pagination,
    isLoading,
    isError,
    error,
    goToPage,
    setLimit,
    setSort,
    setFilters,
    search,
    refresh
  } = usePagination<Document>('paginated-search', {
    initialLimit: 20,
    initialSort: { field: 'created_at', direction: 'desc' },
    enableCache: true
  });

  // Infinite scroll state
  const {
    data: infiniteData,
    hasNext,
    isLoading: infiniteLoading,
    isError: infiniteError,
    errorMessage,
    loadMore,
    reset: resetInfinite
  } = useInfiniteScroll();

  // Update filters when props change
  useEffect(() => {
    setFilters(filters);
  }, [filters, setFilters]);

  // Update search when props change
  useEffect(() => {
    search(searchQuery);
  }, [searchQuery, search]);

  // Infinite scroll load function
  const loadMoreDocuments = async (cursor?: string) => {
    const response = await fetch('/api/documents/cursor-pagination', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        cursor,
        limit: 20,
        direction: 'next',
        filters,
        sort: { field: 'created_at', direction: 'desc' }
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar documentos');
    }

    const result = await response.json();
    
    return {
      data: result.data || [],
      hasNext: result.pagination?.hasNext || false,
      nextCursor: result.pagination?.nextCursor
    };
  };

  // Switch between pagination modes
  const handleModeSwitch = (checked: boolean) => {
    const newMode = checked ? 'infinite' : 'traditional';
    setPaginationMode(newMode);
    
    if (newMode === 'infinite') {
      resetInfinite();
      loadMore();
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Loading component
  const LoadingComponent = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando documentos...</span>
      </div>
    </div>
  );

  // Error component
  const ErrorComponent = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="text-center py-12 px-4 rounded-lg border border-destructive/20 bg-destructive/5">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-destructive mb-2">Erro ao carregar documentos</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );

  // Empty state component
  const EmptyComponent = () => (
    <div className="text-center py-12 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <Grid className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nenhum documento encontrado
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Tente ajustar os filtros ou realizar uma nova busca.
      </p>
      <Button onClick={refresh} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Atualizar
      </Button>
    </div>
  );

  // Get current data based on mode
  const currentData = paginationMode === 'infinite' ? infiniteData : documents;
  const currentLoading = paginationMode === 'infinite' ? infiniteLoading : isLoading;
  const currentError = paginationMode === 'infinite' ? infiniteError : isError;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Pagination mode switch */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="infinite-scroll"
              checked={paginationMode === 'infinite'}
              onCheckedChange={handleModeSwitch}
            />
            <Label htmlFor="infinite-scroll" className="text-sm">
              Scroll infinito
            </Label>
          </div>
          
          {/* Refresh button */}
          <Button 
            onClick={paginationMode === 'infinite' ? () => {
              resetInfinite();
              loadMore();
            } : refresh}
            variant="outline" 
            size="sm"
            disabled={currentLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", currentLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Results info */}
        {paginationMode === 'traditional' && pagination.total > 0 && (
          <div className="text-sm text-muted-foreground">
            {pagination.total.toLocaleString()} documento{pagination.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Content */}
      {currentError && (
        <ErrorComponent 
          message={paginationMode === 'infinite' ? errorMessage : error || 'Erro desconhecido'} 
          onRetry={paginationMode === 'infinite' ? () => {
            resetInfinite();
            loadMore();
          } : refresh}
        />
      )}

      {!currentError && currentData.length === 0 && !currentLoading && (
        <EmptyComponent />
      )}

      {!currentError && (currentData.length > 0 || currentLoading) && (
        <>
          {/* Traditional pagination */}
          {paginationMode === 'traditional' && (
            <>
              {/* Loading overlay for traditional pagination */}
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <LoadingComponent />
                  </div>
                )}
                
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={`${pagination.page}-${pagination.limit}`}
                    className={cn(
                      "transition-opacity duration-200",
                      viewMode === "grid" 
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6" 
                        : "space-y-6",
                      isLoading && "opacity-50"
                    )}
                    variants={container}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                  >
                    {documents.map((doc) => (
                      <motion.div key={doc.id} variants={item} className="h-full">
                        <DocumentCard 
                          document={doc}
                          onDelete={onDocumentDelete}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <AdvancedPagination
                  pagination={pagination}
                  onPageChange={goToPage}
                  onLimitChange={setLimit}
                  isLoading={isLoading}
                  showPageSize={true}
                  showPageJump={true}
                  showInfo={true}
                  className="mt-8"
                />
              )}
            </>
          )}

          {/* Infinite scroll pagination */}
          {paginationMode === 'infinite' && (
            <InfiniteScroll
              hasNext={hasNext}
              isLoading={infiniteLoading}
              isError={infiniteError}
              errorMessage={errorMessage}
              onLoadMore={() => loadMore()}
              onRetry={() => {
                resetInfinite();
                loadMore();
              }}
              className="space-y-6"
            >
              <motion.div 
                className={cn(
                  viewMode === "grid" 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6" 
                    : "space-y-6"
                )}
                variants={container}
                initial="hidden"
                animate="show"
              >
                {infiniteData.map((doc) => (
                  <motion.div key={doc.id} variants={item} className="h-full">
                    <DocumentCard 
                      document={doc}
                      onDelete={onDocumentDelete}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </InfiniteScroll>
          )}
        </>
      )}
    </div>
  );
}