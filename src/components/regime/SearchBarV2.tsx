import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchBarV2Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchBarV2({ 
  value, 
  onChange, 
  placeholder,
  suggestions = [],
  recentSearches = [],
  onSuggestionClick
}: SearchBarV2Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase()) && 
    suggestion.toLowerCase() !== value.toLowerCase()
  ).slice(0, 5);

  const filteredRecentSearches = recentSearches.filter(search =>
    search.toLowerCase().includes(value.toLowerCase()) &&
    search.toLowerCase() !== value.toLowerCase()
  ).slice(0, 3);

  const hasSuggestions = filteredSuggestions.length > 0 || (value === '' && filteredRecentSearches.length > 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsExpanded(true);
    setShowSuggestions(hasSuggestions);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    onSuggestionClick?.(suggestion);
    setShowSuggestions(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`relative transition-all duration-300 ${isExpanded ? 'transform scale-[1.02]' : ''}`}>
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-12 pr-12 h-12 text-base border-2 border-muted/30 focus:border-primary/50 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          {value === '' && filteredRecentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                Buscas Recentes
              </div>
              {filteredRecentSearches.map((search, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSuggestionSelect(search)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="p-3">
              {value !== '' && (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <TrendingUp className="h-3 w-3" />
                  Sugestões
                </div>
              )}
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {suggestion.substring(0, suggestion.toLowerCase().indexOf(value.toLowerCase()))}
                    <span className="font-medium text-primary">
                      {suggestion.substring(
                        suggestion.toLowerCase().indexOf(value.toLowerCase()),
                        suggestion.toLowerCase().indexOf(value.toLowerCase()) + value.length
                      )}
                    </span>
                    {suggestion.substring(suggestion.toLowerCase().indexOf(value.toLowerCase()) + value.length)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}