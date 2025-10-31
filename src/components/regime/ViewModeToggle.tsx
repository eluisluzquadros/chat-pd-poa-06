import React from 'react';
import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ViewMode = 'grid' | 'list';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  const modes: { value: ViewMode; icon: typeof Grid; label: string }[] = [
    { value: 'grid', icon: Grid, label: 'Grade' },
    { value: 'list', icon: List, label: 'Lista' }
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {modes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={viewMode === value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(value)}
          className="h-8 px-3"
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
