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
    areaMin?: number;
    areaMax?: number;
  };
}

interface PresetFiltersProps {
  onApplyPreset: (preset: PresetFilter) => void;
}

export function PresetFilters({ onApplyPreset }: PresetFiltersProps) {
  const presets: PresetFilter[] = [
    {
      id: 'high-buildings',
      label: 'Edifícios Altos (>50m)',
      icon: <Sparkles className="h-4 w-4" />,
      filters: { alturaMin: 50 }
    },
    {
      id: 'very-high-buildings',
      label: 'Edifícios Muito Altos (>80m)',
      icon: <Sparkles className="h-4 w-4" />,
      filters: { alturaMin: 80 }
    },
    {
      id: 'small-lots',
      label: 'Lotes Pequenos (<500m²)',
      filters: { areaMax: 500 }
    },
    {
      id: 'large-lots',
      label: 'Lotes Grandes (>5000m²)',
      filters: { areaMin: 5000 }
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
