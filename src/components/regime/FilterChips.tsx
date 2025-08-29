import React from 'react';
import { Button } from '@/components/ui/button';
import { X, MapPin, Building2, Search } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  value: string;
  type: 'search' | 'bairro' | 'zona';
  onRemove: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll: () => void;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  const getIcon = (type: FilterChip['type']) => {
    switch (type) {
      case 'search':
        return <Search className="h-3 w-3" />;
      case 'bairro':
        return <MapPin className="h-3 w-3" />;
      case 'zona':
        return <Building2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getColorClass = (type: FilterChip['type']) => {
    switch (type) {
      case 'search':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50';
      case 'bairro':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/50';
      case 'zona':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/20 rounded-lg border border-dashed border-muted">
      <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
      
      {filters.map((filter) => (
        <div
          key={filter.id}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm ${getColorClass(filter.type)}`}
        >
          {getIcon(filter.type)}
          <span className="max-w-32 truncate">{filter.value}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={filter.onRemove}
            className="h-4 w-4 p-0 ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      {filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 h-7"
        >
          Limpar todos
        </Button>
      )}
    </div>
  );
}