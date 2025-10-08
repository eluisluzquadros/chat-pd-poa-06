import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Clock, TrendingUp, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  // Keyboard shortcut (CMD+K / CTRL+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsExpanded(true);
        setShowSuggestions(hasSuggestions);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasSuggestions]);

  return (
    <div ref={containerRef} className="relative">
      <div className={`relative transition-all duration-300 ${isExpanded ? 'transform scale-[1.02] shadow-lg' : ''}`}>
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-12 pr-24 h-12 text-base border-2 border-muted/30 focus:border-primary/50 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus:shadow-md"
        />
        
        {/* Keyboard shortcut hint */}
        {!value && !isExpanded && (
          <Badge 
            variant="outline" 
            className="absolute right-14 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs gap-1 pointer-events-none bg-muted/50 border-muted"
          >
            <Command className="h-3 w-3" />
            K
          </Badge>
        )}
        
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-all"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Enhanced Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {value === '' && filteredRecentSearches.length > 0 && (
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Clock className="h-3.5 w-3.5" />
                Buscas Recentes
              </div>
              {filteredRecentSearches.map((search, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSuggestionSelect(search)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/10 rounded-lg transition-all flex items-center gap-2 group"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="group-hover:text-primary transition-colors">{search}</span>
                </button>
              ))}
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="p-3">
              {value !== '' && (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Sugestões
                </div>
              )}
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/10 rounded-lg transition-all flex items-center gap-2 group"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="flex-1">
                    {suggestion.substring(0, suggestion.toLowerCase().indexOf(value.toLowerCase()))}
                    <span className="font-semibold text-primary bg-primary/10 px-1 rounded">
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