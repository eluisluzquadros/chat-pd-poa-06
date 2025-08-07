import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
}

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">
          Model selector temporarily disabled. Selected: {selectedModel || 'None'}
        </p>
      </CardContent>
    </Card>
  );
}