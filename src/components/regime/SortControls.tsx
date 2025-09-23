import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortField = 'bairro' | 'zona' | 'altura' | 'area' | 'permeabilidade';
export type SortDirection = 'asc' | 'desc';

interface SortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

export function SortControls({ sortField, sortDirection, onSortChange }: SortControlsProps) {
  const sortOptions = [
    { value: 'bairro', label: 'Bairro' },
    { value: 'zona', label: 'Zona' },
    { value: 'altura', label: 'Altura Máxima' },
    { value: 'area', label: 'Área Mínima' },
    { value: 'permeabilidade', label: 'Permeabilidade' }
  ];

  const handleFieldChange = (newField: SortField) => {
    onSortChange(newField, sortDirection);
  };

  const toggleDirection = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(sortField, newDirection);
  };

  const getSortIcon = () => {
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    } else if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4" />;
    } else {
      return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        Ordenar por:
      </span>
      
      <Select value={sortField} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        className="h-9 w-9 p-0"
        title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
      >
        {getSortIcon()}
      </Button>
    </div>
  );
}