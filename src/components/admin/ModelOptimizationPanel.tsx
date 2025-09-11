import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

interface ModelOptimizationPanelProps {
  optimizationHistory: any[];
  onOptimize: (config: any) => void;
  isRunning: boolean;
}

export function ModelOptimizationPanel({ optimizationHistory, onOptimize, isRunning }: ModelOptimizationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Otimização de Modelos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Painel de otimização em desenvolvimento.
          {optimizationHistory.length} históricos disponíveis.
        </p>
      </CardContent>
    </Card>
  );
}