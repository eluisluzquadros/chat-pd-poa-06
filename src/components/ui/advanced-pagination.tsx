import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdvancedPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
  showPageSize?: boolean;
  showPageJump?: boolean;
  showInfo?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  pageSizeOptions?: number[];
}

export function AdvancedPagination({
  pagination,
  onPageChange,
  onLimitChange,
  isLoading = false,
  showPageSize = true,
  showPageJump = true,
  showInfo = true,
  className,
  size = 'md',
  pageSizeOptions = [5, 10, 20, 50, 100]
}: AdvancedPaginationProps) {
  const [jumpPage, setJumpPage] = React.useState('');

  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  // Generate page numbers to show
  const getVisiblePages = () => {
    const delta = size === 'sm' ? 1 : size === 'md' ? 2 : 3;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [];

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Info section */}
      {showInfo && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((page - 1) * limit + 1, total)} a{' '}
            {Math.min(page * limit, total)} de {total.toLocaleString()} resultados
          </span>
          
          {showPageSize && (
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => onLimitChange(parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => onPageChange(1)}
            disabled={!hasPrev || isLoading}
            className="hidden sm:flex"
            aria-label="Primeira página"
          >
            <ChevronsLeft className={iconSize} />
          </Button>
          
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev || isLoading}
            aria-label="Página anterior"
          >
            {isLoading ? <Loader2 className={cn(iconSize, 'animate-spin')} /> : <ChevronLeft className={iconSize} />}
            <span className="sr-only sm:not-sr-only sm:ml-2">Anterior</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {visiblePages.map((pageNum, index) => (
              <React.Fragment key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={pageNum === page ? 'default' : 'outline'}
                    size={buttonSize}
                    onClick={() => onPageChange(pageNum as number)}
                    disabled={isLoading}
                    className={cn(
                      'min-w-[40px]',
                      pageNum === page && 'bg-primary text-primary-foreground'
                    )}
                    aria-label={`Página ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || isLoading}
            aria-label="Próxima página"
          >
            <span className="sr-only sm:not-sr-only sm:mr-2">Próximo</span>
            {isLoading ? <Loader2 className={cn(iconSize, 'animate-spin')} /> : <ChevronRight className={iconSize} />}
          </Button>
          
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext || isLoading}
            className="hidden sm:flex"
            aria-label="Última página"
          >
            <ChevronsRight className={iconSize} />
          </Button>
        </div>

        {/* Page jump */}
        {showPageJump && totalPages > 5 && (
          <div className="flex items-center gap-2 text-sm">
            <span>Ir para página:</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-16 text-center"
              placeholder={page.toString()}
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={handleJumpToPage}
              disabled={isLoading || !jumpPage || parseInt(jumpPage) < 1 || parseInt(jumpPage) > totalPages}
            >
              Ir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}