import React from 'react';
import { ChevronDown, Building2, Leaf, Shield } from 'lucide-react';
import { useDomain } from '@/context/DomainContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mapeamento de ícones para os domínios
const iconMap: Record<string, React.ComponentType<any>> = {
  Building2,
  Leaf, 
  Shield,
};

export function DomainSelector() {
  const { currentDomain, availableDomains, isLoading, switchDomain } = useDomain();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
      </div>
    );
  }

  if (!currentDomain) {
    return null;
  }

  const CurrentIcon = iconMap[currentDomain.icon || 'Building2'] || Building2;
  const activeDomains = availableDomains.filter(domain => domain.is_active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center space-x-2 text-sm font-medium"
          data-testid="domain-selector-trigger"
        >
          <CurrentIcon className="h-4 w-4" style={{ color: currentDomain.primary_color }} />
          <span className="hidden sm:inline">{currentDomain.name}</span>
          <span className="sm:hidden">{currentDomain.slug}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <span>Selecionar Domínio</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {activeDomains.map((domain) => {
          const Icon = iconMap[domain.icon || 'Building2'] || Building2;
          const isCurrentDomain = domain.id === currentDomain?.id;
          
          return (
            <DropdownMenuItem
              key={domain.id}
              className="flex items-start space-x-3 p-3 cursor-pointer"
              onClick={() => switchDomain(domain.id)}
              data-testid={`domain-option-${domain.slug}`}
            >
              <Icon 
                className="h-5 w-5 mt-0.5 flex-shrink-0" 
                style={{ color: domain.primary_color }} 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{domain.name}</span>
                  {isCurrentDomain && (
                    <Badge variant="secondary" className="text-xs">
                      Atual
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {domain.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        {activeDomains.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-sm text-muted-foreground">
              Nenhum domínio ativo disponível
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}