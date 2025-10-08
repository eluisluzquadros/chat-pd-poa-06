import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PresetFilter {
  id: string;
  label: string;
  icon?: React.ReactNode;
  filters: {
    bairro?: string;
    zona?: string;
    alturaMin?: number;
    alturaMax?: number;
  };
}

interface PresetFiltersProps {
  onApplyPreset: (preset: PresetFilter) => void;
}

export function PresetFilters({ onApplyPreset }: PresetFiltersProps) {
  const presets: PresetFilter[] = [
    {
      id: 'high-buildings',
      label: 'Edifícios Altos',
      icon: <Sparkles className="h-4 w-4" />,
      filters: { alturaMin: 50 }
    },
    {
      id: 'zot-areas',
      label: 'Áreas ZOT',
      filters: { zona: 'ZOT' }
    },
    {
      id: 'center',
      label: 'Centro',
      filters: { bairro: 'Centro' }
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs font-medium text-muted-foreground flex items-center">
        Filtros Rápidos:
      </span>
      {presets.map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(preset)}
          className="h-7 text-xs gap-1.5"
        >
          {preset.icon}
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
