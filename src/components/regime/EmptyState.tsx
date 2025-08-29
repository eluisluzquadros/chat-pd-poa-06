import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Search, MapPin, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-results' | 'error' | 'loading';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  suggestions = [],
  onSuggestionClick
}: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'no-results':
        return <Search className="h-16 w-16 text-muted-foreground/50" />;
      case 'error':
        return <RefreshCw className="h-16 w-16 text-destructive/50" />;
      default:
        return <Building2 className="h-16 w-16 text-muted-foreground/50" />;
    }
  };

  const getDefaultContent = () => {
    switch (type) {
      case 'no-results':
        return {
          title: 'Nenhum resultado encontrado',
          description: 'Tente ajustar os filtros ou termos de busca para encontrar dados do regime urbanístico.'
        };
      case 'error':
        return {
          title: 'Erro ao carregar dados',
          description: 'Ocorreu um problema ao buscar as informações. Tente novamente.'
        };
      default:
        return {
          title: 'Carregando dados...',
          description: 'Aguarde enquanto carregamos as informações do regime urbanístico.'
        };
    }
  };

  const content = {
    title: title || getDefaultContent().title,
    description: description || getDefaultContent().description
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6 p-6 rounded-full bg-muted/20">
        {getIcon()}
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-3">
        {content.title}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
        {content.description}
      </p>

      {type === 'no-results' && suggestions.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Tente buscar por:</p>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-xs"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {type === 'error' && <RefreshCw className="h-4 w-4 mr-2" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}